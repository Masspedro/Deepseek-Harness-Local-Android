#!/usr/bin/env python3
"""给 @deepseek-ai/dsh-ptc-runtime-node 打 Android 补丁：保留 LD_LIBRARY_PATH。

## 为什么需要（issue #29）

用户报障：重启引擎后 `run_code` 仍失败，报

```
CANNOT LINK EXECUTABLE ".../files/engine/bin/node":
library "libz.so.1" not found
主进程正常、子进程一律起不来
```

## 根因

PTC 模式（`run_code` 工具）拉子进程时，会**清空几乎所有继承的环境变量**，
只保留一份「原生可执行文件启动所需」的白名单（上游 `environment.ts`）：

```js
const STARTUP_ENVIRONMENT_NAMES = new Set([
    "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"
]);
const env = Object.fromEntries(
    Object.keys(process.env)
        .filter(k => !STARTUP_ENVIRONMENT_NAMES.has(k.toUpperCase()) && ...)
        .map(k => [k, void 0])     // undefined = 从继承环境里删除
);
```

这个白名单是**按 Linux/Windows 桌面环境设计的**：

· Linux 上 libz / libssl 等系统库在 `/lib/*/`、由 ldconfig 缓存索引，
  不需要 `LD_LIBRARY_PATH`；
· Windows 用 `SYSTEMROOT` / `PATHEXT` 做 PATH 解析。

**但 Android 不是这样。** Termux 构建的 node 是 bionic 动态链接二进制，
依赖库全部躺在 runtime 自己的 `lib/` 下（`libz.so.1`、`libssl.so`…），
必须靠 `LD_LIBRARY_PATH` 才能被 linker 找到。app 在 `buildEnv()` 里注入了它，
引擎主进程也因此正常启动 —— 但 PTC 子进程把它删了，于是：

    主进程 ✅（继承了 LD_LIBRARY_PATH）
    子进程 ❌ CANNOT LINK EXECUTABLE ... libz.so.1 not found

## 修法

把 `LD_LIBRARY_PATH` 加入白名单。改动只有一行、不改变任何逻辑分支，
且对非 Android 平台完全无副作用（桌面上通常没设这个变量，加了也是空转）。

同时保留 `DSH_PTC_RUNTIME_NODE` 这类显式设置的变量不受影响（它们在
`env` 之后单独赋值）。

## v3（v1.4.33，issue #65）：bootstrap 路径映射兜底

用户报 `code run failed (worker-exit): PTC runtime bootstrap is unavailable in
the subprocess execution world: <engine>/lib/node_modules/@deepseek-ai/
dsh-ptc-runtime-node/lib/process.js`，而**那个文件明明存在**（设备上 md5 与包内
完全一致，`isAbsolute()` 也返回 true）。

根因在 `scriptBootstrapArgs()`：

    const mapped = (path) => {
        const result = fs.processPathFromHostPath(path);
        if (result === void 0) throw new Error(`... unavailable ...`);
        return result;
    };

`fs` 是 `ctx.fs`。`FileSystem` 基类的 `processPathFromHostPath()` 是**空实现**
（无条件返回 undefined），只有 `dsh-fs-local` 覆盖成
`isAbsolute(hostPath) ? resolve(hostPath) : undefined`。只要实际挂载的
provider 不是（或没走到）那个覆盖版本，每次 run_code 都会撞上这条错误。

Android 上引擎、fs provider、PTC worker 在**同一个挂载命名空间**里，
没有任何 sandbox 路径重映射 —— 绝对路径本身就是进程路径。所以补丁的做法是：
`processPathFromHostPath` 返回 undefined 且路径是绝对的 → 原样返回该路径
（打一行 warn 便于诊断）；相对路径仍照旧抛错，否则 worker 会按自己的 cwd
解析并执行错文件。

**注意**：打完补丁必须重算 `BUILD.json`（本脚本已自动做）。`RuntimeInstaller`
用 `BUILD.json.version` 判断是否需要重解压，版本号派生自内容 sha —— 不重算的话
新补丁永远进不到设备上，表现为「明明修好了、装完还是老报错」。

## 用法
    python scripts/patch-ptc-runtime-android.py <runtime 根目录|runtime.zip>

幂等：已打过补丁的跳过（按 MARKER 判断）。形态不识别 → 非零退出。
"""
import os
import sys
import zipfile

MARKER = "[dsh-android] keep LD_LIBRARY_PATH"
ENV_MARKER = "[dsh-android] Inject the runtime library path unconditionally"
# v2（2026-10-23）：白名单扩展到 OpenSSL / 扩展工具链变量。
# 旧版补丁只有 LD_LIBRARY_PATH，必须能识别并升级。
ALLOWLIST_V2_MARKER = '"MAGICK_CONFIGURE_PATH"'
# v3（v1.4.33）：bootstrap 路径映射兜底，修 issue #65。
MAP_MARKER = "[dsh-android] bootstrap path fallback"

OLD_SET = '''const STARTUP_ENVIRONMENT_NAMES = new Set([
	"PATH",
	"PATHEXT",
	"SYSTEMROOT",
	"WINDIR",
	"TEMP",
	"TMP"
]);'''

NEW_SET = '''const STARTUP_ENVIRONMENT_NAMES = new Set([
	"PATH",
	"PATHEXT",
	"SYSTEMROOT",
	"WINDIR",
	"TEMP",
	"TMP",
	// ''' + MARKER + '''
	// Android: the Termux-built node is a dynamically linked bionic binary whose
	// libz/libssl/... live in the runtime's own lib/ directory. Linux resolves
	// those through ldconfig, Android does not — LD_LIBRARY_PATH is the only way
	// the linker finds them. Dropping it here made every PTC `run_code` child die
	// with `CANNOT LINK EXECUTABLE ... libz.so.1 not found` while the main engine
	// (which does inherit the variable) stayed healthy (issue #29).
	"LD_LIBRARY_PATH",
	"OPENSSL_CONF",
	"SSL_CERT_FILE",
	"TMPDIR",
	"HOME",
	"PREFIX",
	"ANDROID_DATA",
	"ANDROID_ROOT",
	"ANDROID_STORAGE",
	// Extension toolchains (audit 2026-10-23). buildEnv exports these for the
	// bundled git / python / perl / ruby / imagemagick / go / rust extensions;
	// without them a PTC worker silently loses the extension and falls back to
	// broken host defaults. All are plain filesystem paths or flags - no secrets.
	"CPATH",
	"LIBRARY_PATH",
	"RUSTFLAGS",
	"PYTHONHOME",
	"PERL5LIB",
	"RUBYLIB",
	"MAGICK_CONFIGURE_PATH",
	"GIT_EXEC_PATH",
	"GIT_TEMPLATE_DIR",
	"GIT_CONFIG_NOSYSTEM",
	"GIT_SSL_CAINFO",
	"CURL_CA_BUNDLE",
	"GOTMPDIR"
]);'''

# 第二处：env 构造后显式注入库路径，不依赖从父进程继承。
#
# 为什么仅靠白名单不够（issue #29，用户「连续 7 天都是这个问题」）：
# 白名单只决定「不被删除」，前提是父进程（引擎）确实带着这个变量。
# 显式注入是无条件的：无论父进程有没有，worker 都拿到正确的库路径。
ENV_OLD = '\t\tconst env = Object.fromEntries(Object.keys(process.env).filter((key) => !STARTUP_ENVIRONMENT_NAMES.has(key.toUpperCase()) && key.toUpperCase() !== "ELECTRON_RUN_AS_NODE").map((key) => [key, void 0]));'

ENV_NEW = '\t\tconst env = Object.fromEntries(Object.keys(process.env).filter((key) => !STARTUP_ENVIRONMENT_NAMES.has(key.toUpperCase()) && key.toUpperCase() !== "ELECTRON_RUN_AS_NODE").map((key) => [key, void 0]));\n\t\t// [dsh-android] Inject the runtime library path unconditionally. Android\'s\n\t\t// linker has no ldconfig, so a bionic node resolves libz/libssl/... only\n\t\t// through LD_LIBRARY_PATH. Keeping it in STARTUP_ENVIRONMENT_NAMES above\n\t\t// preserves an inherited value; this block guarantees one even when the\n\t\t// parent engine was started without it (issue #29: users still hit\n\t\t// "libz.so.1 not found" in PTC mode because inheritance is not reliable).\n\t\t// Derived from the worker executable\'s own location: <engine>/bin/node\n\t\t// -> <engine>/lib:<engine>/usr/lib, so no app-side wiring is needed.\n\t\ttry {\n\t\t\tconst path = globalThis.process?.getBuiltinModule?.("node:path");\n\t\t\tconst fs = globalThis.process?.getBuiltinModule?.("node:fs");\n\t\t\tif (path && fs && executable) {\n\t\t\t\tconst root = path.dirname(path.dirname(executable));\n\t\t\t\tconst libs = [path.join(root, "lib"), path.join(root, "usr/lib")]\n\t\t\t\t\t.filter((candidate) => fs.existsSync(candidate));\n\t\t\t\tif (libs.length > 0) env.LD_LIBRARY_PATH = libs.join(":");\n\t\t\t\t// Rest of the Termux layout the worker needs (issue #35 + audit).\n\t\t\t\t// A bionic node packaged by Termux hard-codes /data/data/com.termux/...\n\t\t\t\t// for its openssl config and TLS store. On a device that ALSO has Termux\n\t\t\t\t// installed those paths exist but are unreadable from our sandbox (EACCES\n\t\t\t\t// -> exit 13), so a wrong inherited value is worse than none at all.\n\t\t\t\tconst pick = (rel, key) => {\n\t\t\t\t\tconst candidate = path.join(root, rel);\n\t\t\t\t\tif (fs.existsSync(candidate)) env[key] = candidate;\n\t\t\t\t};\n\t\t\t\tpick("etc/tls/openssl.cnf", "OPENSSL_CONF");\n\t\t\t\tpick("etc/tls/cert.pem", "SSL_CERT_FILE");\n\t\t\t\tconst tmpDir = path.join(root, "tmp");\n\t\t\t\tif (fs.existsSync(tmpDir)) env.TMPDIR = tmpDir;\n\t\t\t}\n\t\t} catch (_androidEnvProbe) {\n\t\t\t/* best effort: a path probe failure must not break the worker launch */\n\t\t}\n'

MAP_OLD = '\tconst mapped = (path) => {\n\t\tconst result = fs.processPathFromHostPath(path);\n\t\tif (result === void 0) throw new Error(`PTC runtime bootstrap is unavailable in the subprocess execution world: ${path}`);\n\t\treturn result;\n\t};'

MAP_NEW = '\tconst mapped = (path) => {\n\t\tconst result = fs.processPathFromHostPath(path);\n\t\t// [dsh-android] bootstrap path fallback (issue #65).\n\t\t// Upstream throws when the filesystem provider reports no mapping. On\n\t\t// Android the engine, its fs provider and the PTC worker all live in the\n\t\t// SAME mount namespace -- there is no sandbox remapping step, so an\n\t\t// absolute host path IS the process path. Providers that do not override\n\t\t// processPathFromHostPath (the FileSystem base class returns undefined\n\t\t// unconditionally) therefore abort every run_code with an error that\n\t\t// reads like the file is missing while it demonstrably exists.\n\t\t//\n\t\t// Only fall back for an absolute path: a relative one would make the\n\t\t// worker resolve against its own cwd and execute the wrong file, and a\n\t\t// genuinely unmounted path still fails loudly in the child.\n\t\tif (result === void 0) {\n\t\t\tconst nodePath = globalThis.process?.getBuiltinModule?.("node:path");\n\t\t\tif (nodePath?.isAbsolute?.(path)) {\n\t\t\t\tconsole.warn(`[dsh-android] fs provider returned no mapping for ${path}; using the absolute path as-is`);\n\t\t\t\treturn path;\n\t\t\t}\n\t\t\tthrow new Error(`PTC runtime bootstrap is unavailable in the subprocess execution world: ${path}`);\n\t\t}\n\t\treturn result;\n\t};'

TARGET = "lib/node_modules/@deepseek-ai/dsh-ptc-runtime-node/lib/index.js"


def patch_text(text: str) -> tuple[str, bool]:
    if (MARKER in text and ENV_MARKER in text and ALLOWLIST_V2_MARKER in text
            and MAP_MARKER in text):
        return text, False
    changed = False
    # (1) STARTUP_ENVIRONMENT_NAMES keeps LD_LIBRARY_PATH + extension vars
    if MARKER in text and ALLOWLIST_V2_MARKER not in text:
        # 旧版补丁（只加了少数几个变量）：把「注释块 + 注入的变量行」整段剥掉，
        # 回到上游形态再重新打完整版。
        # 形态：\t// [dsh-android] keep LD_LIBRARY_PATH\n ... \t"ANDROID_STORAGE"\n]);
        i = text.find("\t// [dsh-android] keep LD_LIBRARY_PATH")
        if i > 0:
            tail = text.find("]);", i)
            if tail > i:
                text = text[:i] + text[tail:]
                # 剥完可能留下 `"TMP",\n]);` 的尾逗号；OLD_SET 用的是无逗号形态
                text = text.replace('\t"TMP",' + chr(10) + ']);',
                                    '\t"TMP"' + chr(10) + ']);', 1)
    if MARKER not in text:
        if OLD_SET not in text:
            raise SystemExit(
                "ERROR: ptc-runtime-node STARTUP_ENVIRONMENT_NAMES shape not recognised "
                "(upstream changed?) - aborting instead of silently skipping the patch"
            )
        text = text.replace(OLD_SET, NEW_SET, 1)
        changed = True
    # (2) inject the library path explicitly after the env literal
    if ENV_MARKER not in text:
        if ENV_OLD not in text:
            raise SystemExit(
                "ERROR: ptc-runtime-node env construction shape not recognised "
                "(upstream changed?) - aborting instead of silently skipping the patch"
            )
        text = text.replace(ENV_OLD, ENV_NEW, 1)
        changed = True
    # (3) bootstrap 路径映射兜底（issue #65）
    if MAP_MARKER not in text:
        if MAP_OLD not in text:
            raise SystemExit(
                "ERROR: ptc-runtime-node bootstrap mapping shape not recognised "
                "(upstream changed?) - aborting instead of silently skipping the patch"
            )
        text = text.replace(MAP_OLD, MAP_NEW, 1)
        changed = True
    return text, changed


def patch_dir(root: str) -> None:
    path = os.path.join(root, TARGET)
    if not os.path.isfile(path):
        raise SystemExit(f"错误：找不到 {path}")
    with open(path, "r", encoding="utf-8", newline="") as f:
        original = f.read()
    updated, changed = patch_text(original)
    if not changed:
        print("  已是补丁形态")
        return
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(updated)
    print("  已打补丁 -> STARTUP_ENVIRONMENT_NAMES 保留 LD_LIBRARY_PATH")


def restamp(zip_path: str) -> None:
    """补丁改动了内容 → 必须重算 BUILD.json，否则 App 认为「同一版本」不重装。

    RuntimeInstaller 用 `BUILD.json.version` 判断是否需要重解压（相等就跳过）。
    版本号派生自内容 sha，所以打完补丁不重写它，新补丁永远进不到设备上 ——
    表现就是「明明修好了、装完还是老报错」。（issue #65 排查时踩过。）
    """
    import hashlib
    import json as _json
    import time

    def digest(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        return h.hexdigest()

    # 先把旧的 BUILD.json 摘掉再算，避免「用旧版本号算新版本号」的自指
    with zipfile.ZipFile(zip_path) as z:
        entries = [(i, z.read(i.filename)) for i in z.infolist()
                   if i.filename != "BUILD.json"]
        try:
            old = _json.loads(z.read("BUILD.json"))
        except KeyError:
            old = {}
    tmp = zip_path + ".restamp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as out:
        for info, data in entries:
            out.writestr(info, data)
    sha = digest(tmp)
    version = time.strftime("%Y.%m.%d", time.gmtime()) + "-" + sha[:8]
    # 源 zip 没 BUILD.json 时（手工从 _runtime_bak 拷的中间产物就是这种），
    # 别写 "unknown" —— 那会让 RuntimeInstaller 的版本比对与诊断全失效。
    # abi 从文件名推（_rel/arm64-dedup.zip / x86_64-dedup.zip）；
    # engineVersion 推不出来就**不写这个键**，不留假值。
    abi = old.get("abi") or ""
    if not abi:
        name = os.path.basename(zip_path).lower()
        abi = "arm64-v8a" if "arm64" in name else ("x86_64" if "x86" in name else "unknown")
    meta = {
        "version": version,
        "abi": abi,
        "builtAt": int(time.time()),
        "contentSha256": sha,
    }
    engine = old.get("engineVersion")
    if engine:
        meta["engineVersion"] = engine
    with zipfile.ZipFile(tmp, "a", zipfile.ZIP_DEFLATED) as out:
        out.writestr("BUILD.json", _json.dumps(meta, indent=2, ensure_ascii=False) + chr(10))
    os.replace(tmp, zip_path)
    print(f"  BUILD.json 已重算 -> {version}")


def patch_zip(zip_path: str) -> None:
    with zipfile.ZipFile(zip_path, "r") as z:
        try:
            text = z.read(TARGET).decode("utf-8")
        except KeyError:
            raise SystemExit(f"错误：zip 内找不到 {TARGET}")
        updated, changed = patch_text(text)
        if not changed:
            print("  已是补丁形态")
            return
        tmp = zip_path + ".tmp"
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as out:
            for info in z.infolist():
                data = updated.encode("utf-8") if info.filename == TARGET else z.read(info.filename)
                out.writestr(info, data)
    os.replace(tmp, zip_path)
    restamp(zip_path)
    print("  已打补丁 -> STARTUP_ENVIRONMENT_NAMES 保留 LD_LIBRARY_PATH")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    for target in argv[1:]:
        print(f"ptc-runtime-node @ {target}")
        if os.path.isdir(target):
            patch_dir(target)
        elif os.path.isfile(target) and target.lower().endswith(".zip"):
            patch_zip(target)
        else:
            raise SystemExit(f"错误：既不是目录也不是 zip -> {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
