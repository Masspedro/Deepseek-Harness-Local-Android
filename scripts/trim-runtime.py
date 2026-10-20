#!/usr/bin/env python3
"""裁剪 runtime 中「运行时完全用不到」的文件（启动速度优化，v1.4.x）。

## 背景
用户实测：同一台手表，1.3.x（引擎 0.2.0）启动 12 秒，1.4.x（引擎 0.2.1）
接近 40 秒。查下来是上游 0.2.1 的打包方式变了 —— 把**完整的 npm 源码包**
塞进了运行时。

统计 runtime.zip 内的文件构成（解压后）：

   运行必需          20,919 个文件   354.8 MB
   src/ 源码         16,056 个文件   119.6 MB   ← 运行时从不加载
   .d.ts 类型声明     6,700 个文件    23.2 MB   ← 编译期才用
   测试文件           1,043 个文件     6.8 MB   ← 从不运行
   TS 源码              133 个文件     0.7 MB
                                      ─────────
   总计              44,851 个文件   505.1 MB

**超过一半的文件数（53%）是死重量。** 低端设备（手表、老手机）上，
解压 4.5 万个文件与解压 2 万个文件的差距，就是 12 秒 vs 40 秒的差距 ——
每个文件都要 create/写/chmod/inode，Android 的 IO 很贵。

## 裁剪范围（宁保守勿激进）
删除：
  · `<pkg>/src/**`            —— TypeScript 源码，Node 运行 .js 不需要它
  · `**/*.d.ts` / `*.d.mts` / `*.d.cts` —— 类型声明，运行时无意义
  · `**/*.map`                —— sourcemap，只用于调试
  · 测试文件（test/ tests/ __tests__/ *.test.js *.spec.js）
  · 非 LICENSE 的 .md 文档

保留：
  · 所有 .js/.mjs/.cjs/.json/.node/.wasm
  · 所有 LICENSE 文件（法律要求随分发保留）
  · package.json（模块解析必需）
  · bin/ 下的可执行文件、lib/*.so

## 安全边界
  · 只动 `lib/node_modules/` 之下，绝不碰 `bin/`、`lib/*.so`、`etc/`、`usr/`；
  · 任何形如 `package.json` 的字段都不改（不改依赖、不改 entry）；
  · 裁剪后统计「剩余文件里是否仍有 .js 入口」并断言，避免误删整包。

## 用法
    python scripts/trim-runtime.py <runtime.zip> <输出.zip>
    python scripts/trim-runtime.py <runtime.zip> <输出.zip> --dry-run
"""
import argparse
import os
import sys
import zipfile

NODE_MODULES = "lib/node_modules/"


def classify(name: str) -> str | None:
    """返回要删除的类别名；None 表示保留。"""
    if not name.startswith(NODE_MODULES):
        return None

    low = name.lower()
    base = low.rsplit("/", 1)[-1]

    # —— 必须保留（先判，防止误删）——
    if base == "package.json":
        return None
    if base.startswith("license") or base.startswith("licence"):
        return None
    if low.endswith((".js", ".mjs", ".cjs", ".json", ".node", ".wasm")):
        return None

    # —— 可删 ——
    if "/src/" in low:
        return "src/"
    if low.endswith((".d.ts", ".d.mts", ".d.cts")):
        return ".d.ts"
    if low.endswith(".map"):
        return "sourcemap"
    if (
        "/test/" in low
        or "/tests/" in low
        or "/__tests__/" in low
        or ".test." in low
        or ".spec." in low
    ):
        return "tests"
    if low.endswith(".md"):
        return "markdown"
    if low.endswith((".ts", ".tsx")) and not low.endswith(".d.ts"):
        return "ts-source"
    return None


def build(src: str, dst: str, dry_run: bool) -> None:
    with zipfile.ZipFile(src, "r") as zin:
        infos = zin.infolist()
        drop: dict[str, list[zipfile.ZipInfo]] = {}

        for info in infos:
            if info.filename.endswith("/"):
                continue
            cat = classify(info.filename)
            if cat is not None:
                drop.setdefault(cat, []).append(info)

        if not drop:
            raise SystemExit("错误：一个文件都没匹配到 —— 结构可能已变，中止")

        total_drop = sum(len(v) for v in drop.values())
        total_bytes = sum(i.file_size for v in drop.values() for i in v)
        print("  将删除：")
        for cat, items in sorted(drop.items(), key=lambda kv: -len(kv[1])):
            b = sum(i.file_size for i in items)
            print(f"    {cat:12s} {len(items):6d} 文件  {b / 1048576:7.1f} MB")
        print(f"    合计         {total_drop:6d} 文件  {total_bytes / 1048576:7.1f} MB")

        dropped = {id(i) for v in drop.values() for i in v}

        # 安全断言：不能把某包的 .js 入口删光
        remaining_js = sum(
            1
            for i in infos
            if id(i) not in dropped
            and i.filename.startswith(NODE_MODULES)
            and i.filename.lower().endswith((".js", ".mjs", ".cjs"))
        )
        print(f"  保留的 JS 文件：{remaining_js}（应远大于 0）")
        if remaining_js < 1000:
            raise SystemExit(f"错误：只剩 {remaining_js} 个 JS 文件，明显异常，中止")

        if dry_run:
            print("  --dry-run：不写文件")
            return

        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
            kept = 0
            for info in infos:
                if info.filename.endswith("/"):
                    continue
                if id(info) in dropped:
                    continue
                data = zin.read(info.filename)
                out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
                out.compress_type = zipfile.ZIP_DEFLATED
                out.external_attr = info.external_attr
                zout.writestr(out, data)
                kept += 1
            print(f"  写入 {kept} 个文件")

    src_mb = os.path.getsize(src) / 1048576
    dst_mb = os.path.getsize(dst) / 1048576
    print(f"  完成：{src_mb:.1f} MB → {dst_mb:.1f} MB（省 {src_mb - dst_mb:.1f} MB）")


def main() -> int:
    ap = argparse.ArgumentParser(description="裁剪 runtime 中运行时不需要的文件")
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.isfile(args.src):
        raise SystemExit(f"错误：找不到 {args.src}")
    print(f"trim runtime：{args.src} → {args.dst}")
    build(args.src, args.dst, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
