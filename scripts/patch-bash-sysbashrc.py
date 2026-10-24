#!/usr/bin/env python3
"""[dsh-android] 修复交互式 bash 启动时的 Termux 沙箱路径报错（issue #38）。

现象（真机、装了 Termux 时）：
    bash: /data/data/com.termux/files/usr/etc/bash.bashrc: Permission denied
    bash-5.3$

根因：runtime 的 bash 是 Termux 构建，编译期 SYS_BASHRC 宏把系统 rc 文件
写死为 /data/data/com.termux/files/usr/etc/bash.bashrc。该宏【没有环境变量
旁路】（ unlike HOME / TMPDIR / DT_RUNPATH 这些可被 buildEnv 覆盖的硬编码），
bash 交互式启动必然 fopen 它：
  · 设备装有 Termux → 目录存在但跨沙箱 EACCES → 打印 Permission denied；
  · 未装 Termux → ENOENT → 静默。
文件内容只有 PS1 美化 / history 选项 / bash-completion —— 在本 runtime 里
从未被成功读取过，行为早已等价于「无系统 rc」。

修复：把二进制里的该字符串原地覆盖为 /dev/null（等长填充 \\0）——
/dev/null 永远可打开、读到空内容、无任何报错，语义即「没有系统 rc」。
等长替换不改变 ELF 结构与文件大小。

连带处理 bin/pkg：整脚本是 Termux apt/dpkg 体系的 wrapper（第一行就
source /data/data/com.termux/.../termux-setup-package-manager，必然失败），
本 runtime 基于 JS 生态（npm/pnpm），apt 体系不存在。替换为友好提示，
让用户（和终端里的 AI）立刻知道该用什么。

用法：
  python3 patch-bash-sysbashrc.py <runtime-staging-root>   # collect 流程内
  python3 patch-bash-sysbashrc.py --zip <runtime.zip>      # 对现有 zip 原地 patch
  python3 patch-bash-sysbashrc.py --check <root|--zip ...> # 只校验不写

两处均幂等：已打补丁（bash 含 /dev/null 版路径 / pkg 已是提示脚本）则跳过。
"""

import shutil
import sys
import zipfile
from pathlib import Path

TERMUX_BASHRC = b"/data/data/com.termux/files/usr/etc/bash.bashrc\x00"
NULL_BASHRC = b"/dev/null\x00"

PKG_NOTICE = """#!/system/bin/sh
# [dsh-android] Termux 的 pkg/apt/dpkg 包管理体系在本 runtime 不存在。
# 本 runtime 面向 JavaScript 生态：请使用 npm / pnpm，
# 或使用应用内的「社区插件中心」安装 dsh 插件。
echo "pkg: not supported in this runtime." >&2
echo "This runtime uses the JavaScript ecosystem: use 'npm' or 'pnpm' instead." >&2
echo "Example: pnpm add <package>   (or use the in-app plugin center)" >&2
exit 127
""".encode("utf-8")

PKG_MARKER = b"[dsh-android]"


def patch_bash(data: bytes) -> bytes:
    """SYS_BASHRC 字符串 → /dev/null（等长覆盖）。幂等。"""
    if b"/dev/null\x00" in data.replace(TERMUX_BASHRC, b"") and TERMUX_BASHRC not in data:
        return data  # 已 patch（粗判：无 termux bashrc 且含 /dev/null）
    count = data.count(TERMUX_BASHRC)
    if count == 0:
        raise SystemExit("错误：bin/bash 中找不到 Termux bash.bashrc 硬编码（上游形态已变？）")
    if count > 1:
        raise SystemExit(f"错误：bin/bash 中 bash.bashrc 硬编码出现 {count} 次（预期 1），中止")
    return data.replace(TERMUX_BASHRC, NULL_BASHRC + b"\x00" * (len(TERMUX_BASHRC) - len(NULL_BASHRC)))


def patch_pkg(data: bytes) -> bytes:
    if PKG_MARKER in data:
        return data  # 已替换
    return PKG_NOTICE


def process_dir(root: Path, check: bool) -> None:
    for rel, fn in (("bin/bash", patch_bash), ("bin/pkg", patch_pkg)):
        p = root / rel
        if not p.is_file():
            raise SystemExit(f"错误：{p} 不存在（runtime 形态已变？）")
        old = p.read_bytes()
        new = fn(old)
        if old == new:
            print(f"  {rel}: 已是目标状态，跳过")
            continue
        if check:
            print(f"  {rel}: 需要打补丁（--check 未写入）")
            continue
        if len(new) != len(old) and rel.endswith("bash"):
            raise SystemExit("错误：bash patch 改变了长度（不应发生）")
        shutil.copy2(p, p.with_suffix(p.suffix + ".bak"))
        p.write_bytes(new)
        print(f"  {rel}: patched（备份 .bak）")


def process_zip(zpath: Path, check: bool) -> None:
    names = zipfile.ZipFile(zpath).namelist()
    targets = {}
    for rel, fn in (("bin/bash", patch_bash), ("bin/pkg", patch_pkg)):
        if rel not in names:
            raise SystemExit(f"错误：zip 内无 {rel}（runtime 形态已变？）")
        targets[rel] = fn
    with zipfile.ZipFile(zpath) as z:
        items = [(i, z.read(i.filename)) for i in z.infolist()]
    changed = False
    out_items = []
    for info, data in items:
        fn = targets.get(info.filename)
        if fn is None:
            out_items.append((info, data))
            continue
        new = fn(data)
        if new == data:
            print(f"  {info.filename}: 已是目标状态，跳过")
        else:
            print(f"  {info.filename}: patched（{len(data)} -> {len(new)} bytes）")
            changed = True
        out_items.append((info, new))
    if check:
        print("(--check 未写入)")
        return
    if not changed:
        return
    tmp = zpath.with_suffix(".zip.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for info, data in out_items:
            z.writestr(info, data)
    tmp.replace(zpath)
    print(f"重写 {zpath} 完成")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    flags = {a for a in sys.argv[1:] if a.startswith("-")}
    check = "--check" in flags
    if flags - {"--check", "--zip"}:
        raise SystemExit(__doc__)
    if "--zip" in flags:
        if len(args) != 1:
            raise SystemExit(__doc__)
        process_zip(Path(args[0]), check)
    else:
        if len(args) != 1:
            raise SystemExit(__doc__)
        process_dir(Path(args[0]), check)
    print("patch-bash-sysbashrc: OK")


if __name__ == "__main__":
    main()
