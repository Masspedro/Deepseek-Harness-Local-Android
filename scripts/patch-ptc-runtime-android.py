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

## 用法
    python scripts/patch-ptc-runtime-android.py <runtime 根目录|runtime.zip>

幂等：已打过补丁的跳过（按 MARKER 判断）。形态不识别 → 非零退出。
"""
import os
import sys
import zipfile

MARKER = "[dsh-android] keep LD_LIBRARY_PATH"

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
	"LD_LIBRARY_PATH"
]);'''

TARGET = "lib/node_modules/@deepseek-ai/dsh-ptc-runtime-node/lib/index.js"


def patch_text(text: str) -> tuple[str, bool]:
    if MARKER in text:
        return text, False
    if OLD_SET not in text:
        raise SystemExit(
            "错误：ptc-runtime-node 的 STARTUP_ENVIRONMENT_NAMES 形态未识别"
            "（上游已变？）—— 中止，避免静默漏打补丁"
        )
    return text.replace(OLD_SET, NEW_SET, 1), True


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
