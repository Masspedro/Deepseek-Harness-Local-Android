#!/usr/bin/env python3
"""给 dsh 引擎补上 Android 的终端（PTY）支持 —— issue #18 第二层。

## 为什么需要
`@deepseek-ai/dsh-subprocess-local` 是 Web 终端与持久 bash 工具的执行底座，
它在两处不认识 Android：

1. **进程探测器拒收该平台**。`createProcessInspector()` 只认 linux/darwin/win32，
   其它平台直接抛 `terminal inspection is unsupported on platform android`。
   Termux 构建的 node 报告 `process.platform === "android"`（不是 "linux"），
   于是任何终端的 spawn 都在这一步就失败。Android 有完整 procfs，
   上游的 LinuxProcessInspector 本来就是对的实现 —— 只是没被选上。

2. **node-pty 是空壳**。node-pty 无 Android 预编译产物，官方收集脚本把它换成
   「一调用就抛错」的占位实现（见 collect-termux-runtime.sh）。真实 PTY 能力
   由 App 侧原生助手 `dsh_pty_exec` 提供（app/src/main/cpp/dsh_pty_exec.c），
   本脚本把 node-pty 换成转发到该助手的兼容实现。

## 产物
- runner-launch-*.js：探测器认 android（= linux 语义）
- index.js：活动状态判定同样认 android
- node-pty/lib/index.js：真实 Android 实现（转发 dsh_pty_exec）
- node-pty/package.json：版本标记改成 android 实现（幂等判据）

## 用法
    python scripts/patch-node-pty-android.py <runtime 根目录|runtime.zip> [更多...]
    python scripts/patch-node-pty-android.py <runtime.zip> --backup-dir _runtime_bak

幂等：按 node-pty/package.json 的 version 标记判断，已打过则跳过。
未识别任何目标 → 非零退出（CI fail-fast：漏打补丁 = 终端对用户不可用）。
"""
import json
import os
import shutil
import sys
import zipfile

MARKER_VERSION = "0.0.0-android-ptyexec"

# node-pty 兼容实现（单一真源）。放到独立文件是为了避免与 Kotlin/Python 的
# 多层字符串转义纠缠 —— 内容原样写入 runtime。
NODE_PTY_IMPL = r'''/*
 * node-pty Android 后端（roadmap M2）。
 *
 * 为什么需要这个文件
 * ------------------
 * dsh 的 Web 终端与持久 bash 工具都经 `@deepseek-ai/dsh-subprocess-local`
 * 调 `require("node-pty").spawn(...)` 申请一个**新的**伪终端。node-pty 没有
 * Android 预编译产物，官方 runtime 收集脚本会把它替换成「一调用就抛错」的
 * 空壳（见 scripts/collect-termux-runtime.sh）——于是终端功能在 Android 上
 * 整体不可用（issue #18）。
 *
 * 本文件就是那个空壳的**真实实现**：把 spawn 转发给随 APK 分发的原生助手
 * `dsh_pty_exec`（app/src/main/cpp/dsh_pty_exec.c），由它 fork 出挂 PTY 的
 * shell，并在 PTY 与本进程的管道之间搬运字节。
 *
 * 进程拓扑
 * --------
 *   node 引擎 ── spawn ──> dsh_pty_exec ── fork+PTY ──> bash
 *                stdin/stdout 管道     PTY master↔slave
 *                fd3 = 指令下行（R/K）
 *                pidfile = pid/退出状态上行
 *
 * 维护提示
 * --------
 * 这个文件由 scripts/patch-node-pty-android.py 写入 runtime，**单一真源**是
 * 那个脚本（CI 的 collect-termux-runtime.sh 也调它）。改这里等于只改了一个
 * 副本，下次重建 runtime 会被覆盖。
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { EventEmitter } = require("events");

/** 助手相对引擎根的位置（EngineConfig 部署到 <engineRoot>/bin/dsh_pty_exec）。 */
const EXEC_NAME = "dsh_pty_exec";

/** pidfile 参数名（与 dsh_pty_exec.c 的解析一致）。 */
const PIDFILE_FLAG = "--dsh-pty-pidfile";

/** 定位助手：优先 PREFIX（引擎根，由 Kotlin 注入），再退回相对本模块的推断。 */
function locateHelper() {
  const candidates = [];
  const prefix = process.env.PREFIX;
  if (prefix) candidates.push(path.join(prefix, "bin", EXEC_NAME));
  // node_modules/node-pty/lib/index.js → 上溯到 runtime 根
  candidates.push(path.resolve(__dirname, "..", "..", "..", "bin", EXEC_NAME));
  candidates.push(path.resolve(__dirname, "..", "..", "..", "..", "bin", EXEC_NAME));
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      return c;
    } catch (_) {
      /* 继续找下一个候选 */
    }
  }
  return undefined;
}

/** 同步睡眠：只用于 spawn 后取 pid、退出后取状态这两个极短窗口。 */
function sleepMs(ms) {
  const shared = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(shared), 0, 0, ms);
}

/** 把 pidfile 读成 { pid } 或 { exitCode, signal }；读不到返回 undefined。 */
function readStatus(pidfile) {
  try {
    const text = fs.readFileSync(pidfile, "utf8").trim();
    if (text.startsWith("EXIT ")) {
      const parts = text.split(/\s+/);
      const code = Number.parseInt(parts[1], 10);
      const sig = Number.parseInt(parts[2], 10);
      return {
        exitCode: Number.isFinite(code) ? code : 0,
        signal: Number.isFinite(sig) && sig > 0 ? sig : undefined,
      };
    }
    const pid = Number.parseInt(text, 10);
    return Number.isFinite(pid) && pid > 0 ? { pid } : undefined;
  } catch (_) {
    return undefined;
  }
}

/** node-pty 兼容终端：接口面 = 上游 LocalTerminalHandle 实际用到的成员。 */
class AndroidTerminal extends EventEmitter {
  constructor(child, pidfile, file, cols, rows) {
    super();
    this.child = child;
    this.pidfile = pidfile;
    this._file = file;
    this._cols = cols;
    this._rows = rows;
    this._killTimer = undefined;
    this._exited = false;
    this._paused = false;

    // ⚠️ pid 必须**同步**可得：LocalTerminalHandle 在构造时就读 terminal.pid。
    // 助手 fork 完才写文件，这里短轮询等它（上限 2s，足够 fork 完成）。
    let status;
    for (let i = 0; i < 200; i++) {
      status = readStatus(pidfile);
      if (status !== undefined && status.pid !== undefined) break;
      sleepMs(10);
    }
    this.pid = status !== undefined && status.pid !== undefined ? status.pid : 0;

    this._onStdout = (buf) => {
      if (!this._paused) this.emit("data", buf.toString("utf8"));
    };
    child.stdout.on("data", this._onStdout);
    child.on("exit", () => this._settle());
    child.on("error", () => this._settle());
  }

  /** 子进程退出：从 pidfile 取真实退出码/信号（字节流已全部走 stdout）。 */
  _settle() {
    if (this._exited) return;
    this._exited = true;
    let exitCode = 0;
    let signal;
    // 助手写完状态才退出：稍等一下确保文件已落盘
    for (let i = 0; i < 100; i++) {
      const st = readStatus(this.pidfile);
      if (st !== undefined && st.exitCode !== undefined) {
        exitCode = st.exitCode;
        signal = st.signal;
        break;
      }
      sleepMs(5);
    }
    try {
      fs.unlinkSync(this.pidfile);
    } catch (_) {
      /* 清理失败无碍 */
    }
    this.emit("exit", { exitCode, signal });
  }

  onData(cb) {
    this.on("data", cb);
    return { dispose: () => this.off("data", cb) };
  }

  onExit(cb) {
    this.on("exit", cb);
    return { dispose: () => this.off("exit", cb) };
  }

  write(data) {
    if (this._exited) return;
    try {
      this.child.stdin.write(data);
    } catch (_) {
      /* 管道已关：忽略，退出事件会随后到达 */
    }
  }

  resize(cols, rows) {
    if (this._exited) return;
    this._cols = cols;
    this._rows = rows;
    this._control(`R ${cols} ${rows}`);
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  kill(signal) {
    if (this._exited) return;
    // ⚠️ 必须允许**重复**调用：引擎的清理是 SIGTERM → 等宽限期 → SIGKILL 的升级
    // 序列，而交互式 bash 默认忽略 SIGTERM —— 如果这里只发第一次，升级就被吞掉，
    // 终端关闭后 shell 会作为孤儿残留。实测踩过（"terminal cleanup failed;
    // surviving pid: N"）。
    this._control(`K ${signal === undefined ? "SIGTERM" : signal}`);
    if (this._killTimer === undefined) {
      // 兜底：信号没能收掉子进程组时，直接终止助手本身（它会带走子进程）
      this._killTimer = setTimeout(() => {
        if (!this._exited) {
          try {
            this.child.kill("SIGKILL");
          } catch (_) {
            /* 已退出 */
          }
        }
      }, 5000);
      if (typeof this._killTimer.unref === "function") this._killTimer.unref();
    }
  }

  _control(line) {
    try {
      this.child.stdio[3].write(`${line}\n`);
    } catch (_) {
      /* 控制通道不可用：非致命，退出路径仍能从 pidfile 取状态 */
    }
  }
}

/**
 * 与 node-pty 同形的 spawn。
 * @param {string} file 可执行文件绝对路径（引擎传 shell 路径）
 * @param {string[]} args 参数（不含程序名）
 * @param {{name?:string,cols?:number,rows?:number,cwd?:string,env?:object}} options
 */
function spawnPty(file, args, options) {
  const helper = locateHelper();
  if (helper === undefined) {
    throw new Error(
      "node-pty(android): dsh_pty_exec helper not found; expected $PREFIX/bin/" + EXEC_NAME,
    );
  }
  const cols = options && Number.isFinite(options.cols) ? options.cols : 80;
  const rows = options && Number.isFinite(options.rows) ? options.rows : 24;
  const cwd = options && options.cwd && options.cwd.length > 0 ? options.cwd : os.homedir();
  const tmpBase =
    process.env.TMPDIR && process.env.TMPDIR.length > 0 ? process.env.TMPDIR : os.tmpdir();
  const pidfile = path.join(
    tmpBase,
    "dsh-pty-" + process.pid + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".pid",
  );

  // pidfile 走 argv 末尾（fd 3 是 JS→助手的单向下行通道，不能反向传参）
  const argv = [String(rows), String(cols), cwd, file].concat(args || [], [PIDFILE_FLAG, pidfile]);
  const child = spawn(helper, argv, {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: options && options.env ? options.env : process.env,
    cwd: process.env.HOME && process.env.HOME.length > 0 ? process.env.HOME : cwd,
  });
  // 助手的诊断输出走 stderr：不混入终端内容，只在出错时留给排查
  child.stderr.on("data", (buf) => {
    const text = buf.toString("utf8").trim();
    if (text.length > 0) process.stderr.write("[dsh_pty_exec] " + text + "\n");
  });

  return new AndroidTerminal(child, pidfile, file, cols, rows);
}

module.exports = { spawn: spawnPty };
module.exports.default = module.exports;
'''

# ---------------------------------------------------------------------------
# JS 补丁：让探测/活动判定接受 android（procfs 语义与 linux 相同）
# ---------------------------------------------------------------------------
PATCHES = [
    (
        "@deepseek-ai/dsh-subprocess-local/lib/runner-launch",
        'if (platform === "linux") return new LinuxProcessInspector(arch, internals);',
        'if (platform === "linux" || platform === "android") return new LinuxProcessInspector(arch, internals);',
        "进程探测器接受 android（Termux node 报告的平台名）",
    ),
    (
        "@deepseek-ai/dsh-subprocess-local/lib/index.js",
        'this.platform === "linux" && observed.complete === true',
        '(this.platform === "linux" || this.platform === "android") && observed.complete === true',
        "终端活动状态判定接受 android",
    ),
]


def log(msg):
    print(msg, flush=True)


def patch_js(text, old, new):
    if new in text:
        return text, "already"
    if old not in text:
        return text, "missing"
    return text.replace(old, new, 1), "patched"


def patch_dir(root):
    """在已解压的 runtime 目录上打补丁。返回改动条数。"""
    nm = os.path.join(root, "lib", "node_modules")
    changed = 0

    # 1) 探测器 / 活动判定
    for rel, old, new, why in PATCHES:
        target_dir = os.path.join(nm, os.path.dirname(rel))
        if not os.path.isdir(target_dir):
            log(f"WARN: 目录缺失 {target_dir}（跳过：{why}）")
            continue
        base = os.path.basename(rel)
        hit = False
        for name in sorted(os.listdir(target_dir)):
            if not (name.startswith(base) and name.endswith(".js")):
                continue
            p = os.path.join(target_dir, name)
            with open(p, encoding="utf-8") as f:
                text = f.read()
            out, state = patch_js(text, old, new)
            if state == "patched":
                with open(p, "w", encoding="utf-8", newline="\n") as f:
                    f.write(out)
                log(f"  patched {rel}{name[len(base):]}: {why}")
                changed += 1
            hit = True
        if not hit:
            log(f"WARN: 未找到 {rel}*（跳过：{why}）")

    # 2) node-pty 真实实现
    pkg_dir = os.path.join(nm, "node-pty")
    if os.path.isdir(pkg_dir):
        lib_dir = os.path.join(pkg_dir, "lib")
        os.makedirs(lib_dir, exist_ok=True)
        impl = os.path.join(lib_dir, "index.js")
        cur = ""
        if os.path.isfile(impl):
            with open(impl, encoding="utf-8") as f:
                cur = f.read()
        if cur == NODE_PTY_IMPL:
            log("  node-pty: 已是当前 Android 实现，跳过")
        else:
            with open(impl, "w", encoding="utf-8", newline="\n") as f:
                f.write(NODE_PTY_IMPL)
            with open(
                os.path.join(pkg_dir, "package.json"), "w", encoding="utf-8", newline="\n"
            ) as f:
                json.dump(
                    {"name": "node-pty", "version": MARKER_VERSION, "main": "lib/index.js"},
                    f,
                    separators=(",", ":"),
                )
                f.write("\n")
            log("  node-pty: 写入 Android PTY 实现（转发 dsh_pty_exec）")
            changed += 1
    else:
        log("WARN: node-pty 不在依赖树中（跳过：终端 PTY 后端）")

    return changed


def patch_zip(zip_path, backup_dir=None):
    """在 runtime.zip 上原地打补丁（保持压缩级别与顺序）。"""
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        infos = {i.filename: i for i in z.infolist()}
        blobs = {n: z.read(n) for n in names}

    nm = "lib/node_modules/"
    changed = 0

    def patch_entry(rel, old, new, why):
        nonlocal changed
        matches = [n for n in names if n.startswith(nm + rel) and n.endswith(".js")]
        if not matches:
            log(f"WARN: 未找到 {rel}*（跳过：{why}）")
            return
        for n in matches:
            text = blobs[n].decode("utf-8")
            out, state = patch_js(text, old, new)
            if state == "patched":
                blobs[n] = out.encode("utf-8")
                log(f"  patched {n}: {why}")
                changed += 1

    for rel, old, new, why in PATCHES:
        patch_entry(rel, old, new, why)

    pkg = nm + "node-pty/"
    impl_name = pkg + "lib/index.js"
    pkg_json = pkg + "package.json"
    if any(n.startswith(pkg) for n in names):
        cur = blobs.get(impl_name, b"").decode("utf-8", errors="replace")
        if cur == NODE_PTY_IMPL:
            log("  node-pty: 已是当前 Android 实现，跳过")
        else:
            blobs[impl_name] = NODE_PTY_IMPL.encode("utf-8")
            blobs[pkg_json] = (
                json.dumps(
                    {"name": "node-pty", "version": MARKER_VERSION, "main": "lib/index.js"},
                    separators=(",", ":"),
                )
                + "\n"
            ).encode("utf-8")
            if impl_name not in infos:
                infos[impl_name] = zipfile.ZipInfo(impl_name)
            if pkg_json not in infos:
                infos[pkg_json] = zipfile.ZipInfo(pkg_json)
            log("  node-pty: 写入 Android PTY 实现（转发 dsh_pty_exec）")
            changed += 1
    else:
        log("WARN: node-pty 不在依赖树中（跳过：终端 PTY 后端）")

    if changed == 0:
        log("nothing to do (补丁已存在)")
        return 0

    if backup_dir:
        os.makedirs(backup_dir, exist_ok=True)
        stamp = os.path.basename(zip_path) + ".pre-pty"
        dst = os.path.join(backup_dir, stamp)
        if not os.path.exists(dst):
            shutil.copy2(zip_path, dst)
            log(f"backup -> {dst}")

    tmp = zip_path + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as out:
        for n in names:
            info = infos[n]
            info.compress_type = zipfile.ZIP_DEFLATED
            out.writestr(info, blobs[n])
    os.replace(tmp, zip_path)
    log(f"patched {changed} file(s) -> {zip_path}")
    return 0


def main(argv):
    if len(argv) < 2:
        log(__doc__)
        return 2
    targets = []
    backup_dir = None
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--backup-dir":
            i += 1
            backup_dir = argv[i] if i < len(argv) else None
        else:
            targets.append(a)
        i += 1

    if not targets:
        log("ERROR: 未给出 runtime 目录或 zip")
        return 2

    rc = 0
    for t in targets:
        log(f"== {t}")
        if os.path.isdir(t):
            n = patch_dir(t)
            log(f"   {n} 处改动")
        elif os.path.isfile(t) and t.endswith(".zip"):
            patch_zip(t, backup_dir)
        else:
            log(f"ERROR: 无法识别 {t}")
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv))
