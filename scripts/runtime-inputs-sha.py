#!/usr/bin/env python3
"""runtime-inputs-sha.py —— 计算 runtime 构建输入（脚本集合）的内容指纹。

用途：runtime-build 发布时把指纹写进 runtime-inputs.json；decide 决策时比对
"资产齐全 + 指纹未变" 才跳过重建，避免「改了 runtime 脚本但 prerelease 已存在
→ 跳过 → tag 包用了旧 runtime」的静默漏发。

指纹算法：输入文件按相对路径排序，逐行 `<相对路径>:<文件 sha256>` 拼接后再整体
sha256。与平台、mtime、git 状态无关，跨 run 稳定。

用法: runtime-inputs-sha.py [repo_root]     # 输出 64 位 hex
"""
import glob
import hashlib
import os
import sys

# 只收「真正决定 runtime.zip 内容」的输入；校验类脚本（verify-*）不算。
EXPLICIT = [
    "scripts/collect-termux-runtime.sh",
    "scripts/build-runtime.sh",
    "scripts/dedupe-runtime.py",
    "scripts/dedupe-zod.py",
    "scripts/trim-runtime.py",
    "scripts/make-lite-runtime.py",
]
GLOBS = [
    "scripts/patch-*.py",
]


def collect(root: str) -> list:
    paths = []
    for rel in EXPLICIT:
        full = os.path.join(root, rel)
        if os.path.isfile(full):
            paths.append(rel)
    for pattern in GLOBS:
        for full in glob.glob(os.path.join(root, pattern)):
            if os.path.isfile(full):
                paths.append(os.path.relpath(full, root).replace(os.sep, "/"))
    return sorted(set(paths))


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    files = collect(root)
    if not files:
        print("error: no runtime inputs found under root=" + root, file=sys.stderr)
        sys.exit(1)
    outer = hashlib.sha256()
    for rel in files:
        inner = hashlib.sha256()
        with open(os.path.join(root, rel), "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                inner.update(chunk)
        outer.update(f"{rel}:{inner.hexdigest()}\n".encode())
    print(outer.hexdigest())


if __name__ == "__main__":
    main()
