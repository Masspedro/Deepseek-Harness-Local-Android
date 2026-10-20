#!/usr/bin/env python3
"""从 runtime.zip 中去除重复的 zod 副本（启动速度优化）。

## 背景（v1.4.x 性能问题）
上游 0.2.1-rc.2 把依赖布局从「扁平提升」改成了「逐包嵌套」：
同一个 zod 被装进 50 个不同的 `node_modules` 子目录，解压后合计 **201.5 MB**，
且每份都带完整的 `src/*.ts` 与 `*.test.ts`。

对 Android 的影响是双重的：

  · **首次启动**：要解压 5 万个文件（0.2.0 只有 1.7 万），IO 放大 3 倍；
  · **每次启动**：Node 的 ESM 解析每遇到一层 `node_modules` 就要 `stat` +
    读 `package.json`。嵌套层数翻倍，冷启动的模块解析成本随之上升
    （实测 import 引擎入口 2.3s）。

## 为什么可以安全去重
逐份核对过 51 个 zod 副本：

  · 顶层 `lib/node_modules/zod` = **4.6.7**（1 份）
  · 各包内嵌     = **4.4.3**（50 份，package.json 逐字节相同）

再核对全部 67 个声明 zod 依赖的顶层包的版本约束：`4.4.3`、`^4.0`、`^4.2`、
`^3.25 || ^4` —— **4.4.3 全部满足**。

因此做法是：**把顶层那份换成 4.4.3，然后删除所有嵌套副本**。
版本语义不发生任何变化（原本解析到的就是 4.4.3），只是把它们合并成一份。

## 为什么不用 4.6.7
顶层 4.6.7 虽然更新，但嵌套的 50 份是 4.4.3 —— 让它们改跑 4.6.7 属于
**跨小版本升级**，zod 4.x 之间仍有行为差异风险。做性能优化不该顺手改依赖版本。

## 用法
    python scripts/dedupe-zod.py <runtime.zip> <输出.zip>
    python scripts/dedupe-zod.py <runtime.zip> <输出.zip> --backup-dir _runtime_bak

幂等：已去重的包再次运行会提示「无重复副本」并原样输出。
"""
import argparse
import os
import shutil
import sys
import zipfile

TOP_ZOD = "lib/node_modules/zod/"


def is_nested_zod(name: str) -> bool:
    """是否是某个包内嵌的 zod 副本（排除顶层那一份）。"""
    if not name.startswith("lib/node_modules/"):
        return False
    if name.startswith(TOP_ZOD):
        return False
    # 形如 lib/node_modules/<pkg>/node_modules/zod/...
    # 或     lib/node_modules/@scope/<pkg>/node_modules/zod/...
    rest = name[len("lib/node_modules/"):]
    parts = rest.split("/")
    # 找到第二个 node_modules，其后紧跟 zod
    for i, p in enumerate(parts):
        if p == "node_modules" and i + 1 < len(parts) and parts[i + 1] == "zod":
            return True
    return False


def build(src: str, dst: str) -> None:
    with zipfile.ZipFile(src, "r") as zin:
        infos = zin.infolist()

        # 1) 挑一份嵌套 zod 作为「4.4.3 的样板」
        sample_prefix = None
        for info in infos:
            if is_nested_zod(info.filename):
                # lib/node_modules/<pkg>/node_modules/zod/  → 取到 zod/ 为止
                idx = info.filename.find("/node_modules/zod/")
                sample_prefix = info.filename[: idx + len("/node_modules/zod/")]
                break
        if sample_prefix is None:
            raise SystemExit("错误：没找到任何嵌套 zod 副本 —— 上游布局可能已变，中止")

        # 2) 统计要删除的
        drop = [i for i in infos if is_nested_zod(i.filename)]
        drop_bytes = sum(i.file_size for i in drop)
        print(f"  嵌套副本：{len(drop)} 个文件，{drop_bytes / 1048576:.1f} MB（解压后）")
        print(f"  样板来源：{sample_prefix}")

        # 3) 顶层 zod 也要一并替换 —— 先记录要删的顶层文件
        top = [i for i in infos if i.filename.startswith(TOP_ZOD)]
        print(f"  顶层 zod：{len(top)} 个文件（将替换为样板那份）")

        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
            written = 0
            # 3a) 先写样板（改名为顶层 zod）
            for info in infos:
                if not info.filename.startswith(sample_prefix):
                    continue
                rel = info.filename[len(sample_prefix):]
                name = TOP_ZOD + rel
                data = zin.read(info.filename)
                out = zipfile.ZipInfo(name, date_time=info.date_time)
                out.compress_type = zipfile.ZIP_DEFLATED
                out.external_attr = info.external_attr
                zout.writestr(out, data)
                written += 1
            print(f"  写入样板为顶层 zod：{written} 个文件")

            # 3b) 其余条目：跳过所有嵌套 zod 与旧顶层 zod
            skipped = 0
            for info in infos:
                if info.filename.endswith("/"):
                    continue
                if is_nested_zod(info.filename):
                    skipped += 1
                    continue
                if info.filename.startswith(TOP_ZOD):
                    skipped += 1
                    continue
                data = zin.read(info.filename)
                out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
                out.compress_type = zipfile.ZIP_DEFLATED
                out.external_attr = info.external_attr
                zout.writestr(out, data)
            print(f"  跳过（重复/旧顶层）：{skipped} 个文件")

    src_mb = os.path.getsize(src) / 1048576
    dst_mb = os.path.getsize(dst) / 1048576
    print(f"  完成：{src_mb:.1f} MB → {dst_mb:.1f} MB（省 {src_mb - dst_mb:.1f} MB）")


def main() -> int:
    ap = argparse.ArgumentParser(description="去除 runtime 中重复的 zod 副本")
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--backup-dir")
    args = ap.parse_args()

    if not os.path.isfile(args.src):
        raise SystemExit(f"错误：找不到 {args.src}")
    if os.path.abspath(args.src) == os.path.abspath(args.dst):
        raise SystemExit("错误：源与目标不能相同")

    if args.backup_dir:
        os.makedirs(args.backup_dir, exist_ok=True)
        bak = os.path.join(args.backup_dir, os.path.basename(args.src))
        if not os.path.exists(bak):
            shutil.copy2(args.src, bak)
            print(f"  备份 → {bak}")

    print(f"zod 去重：{args.src} → {args.dst}")
    build(args.src, args.dst)
    return 0


if __name__ == "__main__":
    sys.exit(main())
