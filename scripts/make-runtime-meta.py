#!/usr/bin/env python3
"""make-runtime-meta.py —— 从 runtime.zip 重建 runtime-meta.json。

背景：fetch-runtime 的第 2 级来源（releases/latest 正式发布）只附带
runtime-<abi>.zip，不带 meta。zip 内已由 build-runtime.sh 写入 BUILD.json
（version / abi / engineVersion / builtAt / contentSha256），文件级 sha256、
size、unpackedBytes 可直接从 zip 本身算出，因此 meta 可无损重建，
schema 与 build-runtime.sh 落盘的 runtime-meta.json 完全一致。

用法: make-runtime-meta.py <runtime.zip> <out.json>
"""
import hashlib
import json
import os
import sys
import zipfile


def main() -> None:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <runtime.zip> <out.json>", file=sys.stderr)
        sys.exit(2)
    path, meta_path = sys.argv[1], sys.argv[2]

    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)

    with zipfile.ZipFile(path) as z:
        build = json.loads(z.read("BUILD.json").decode("utf-8"))
        unpacked = sum(i.file_size for i in z.infolist())

    meta = {
        "version": build["version"],
        "abi": build["abi"],
        "engineVersion": build["engineVersion"],
        "builtAt": build["builtAt"],
        "sha256": h.hexdigest(),
        "size": os.path.getsize(path),
        "unpackedBytes": unpacked,
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(meta, indent=2) + "\n")
    print(
        f"runtime-meta: {meta['version']} {meta['sha256'][:12]}… "
        f"{meta['size'] / 1048576:.1f} MB (zip) · engine {meta['engineVersion']}"
    )


if __name__ == "__main__":
    main()
