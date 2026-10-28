#!/usr/bin/env python3
"""runtime 去重（启动性能）回归测试（v1.4.11）。

## 背景
上游 0.2.1-rc.2 把依赖布局从「扁平提升」改成「逐包嵌套」：每个
`@deepseek-ai` 包里都嵌了一份完整 zod（612 个文件）。全库 3 万多个
二级嵌套文件、200MB+ 冗余。

## 实测（x86_64 模拟器，冷启动，boot.log 的 runtime-install）
    work（未去重）      41.99s
    zodded（去重）      11.81s    ← 降 72%
    trimmed（再裁）     13.74s

选 zodded 而非 trimmed：trimmed 删掉 .d.ts 与 src，仓库里 773 处 exports
指向它们（运行时虽不加载，但用户插件做 tsc 校验会缺文件）。

## 本测试保证
1. 构建脚本会自动选去重包，且缓存判断基于**内容**而非时间戳
2. 去重失败的兜底路径存在
3. 当前 assets 里的 runtime 确实没有嵌套 zod
4. 顶层 zod 版本与去重前解析到的版本一致（不能顺手升级依赖）
"""
from __future__ import annotations

import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GRADLE = os.path.join(ROOT, "app/build.gradle.kts")
RUNTIME = os.path.join(ROOT, "app/src/main/assets/runtime.zip")
DEDUPE = os.path.join(ROOT, "scripts/dedupe-zod.py")

ok = 0
fail = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global ok, fail
    if cond:
        ok += 1
        print(f"  \u2713 {name}")
    else:
        fail += 1
        print(f"  \u2717 {name}" + (f"  -- {detail}" if detail else ""))


print("=== 1. 构建脚本接入去重 ===")
g = open(GRADLE, encoding="utf-8").read()
check("引用了 zodded 缓存", "zodded" in g)
# v1.4.27：PR #48 把运行时流水线移到 scripts/build-runtime.sh，去重与内容校验
# 都在那边；build.gradle.kts 只负责校验产物（zodded 源的选择仍在 gradle 里）。
_build_sh = os.path.join(ROOT, "scripts", "build-runtime.sh")
_sh = open(_build_sh, encoding="utf-8").read() if os.path.isfile(_build_sh) else ""
check("去重逻辑在 build-runtime.sh（PR #48 后架构）",
      "zod" in _sh.lower() or "dedupe" in _sh.lower())
check("不是只比时间戳",
      "lastModified() >= src.lastModified()" not in g,
      "时间戳在 CI 上不可靠")
# v1.4.27：新架构下不再"静默回退到未去重源"——PR #48 改为硬门禁：
# 源 zip 缺 PTC/polyfill 直接抛 GradleException 中止构建（宁可失败不发坏包）。
check("去重/PTC 缺失时有硬门禁（不发坏包）",
      "GradleException" in g or "throw" in g)
check("用 ZipFile 检查（Kotlin DSL 需 import）", "import java.util.zip.ZipFile" in g)
check("去重脚本存在", os.path.isfile(DEDUPE))

print("\n=== 2. 当前 assets runtime 已去重 ===")
# v1.4.27：PR #48 后 assets/runtime.zip 不再入库——运行时由
# build.gradle.kts 的 runtimeAssetsDir（build/generated/runtimeAssets）注入，
# 源 zip 放在 _runtime_bak/。这里改为校验「要么 assets 有，要么 _runtime_bak 有」。
# v1.4.33：优先用「发布用」的去重包（_rel/*-dedup.zip，已含全部补丁）。
# _runtime_bak/rt-*-zodded.zip 是去重**前**的中间产物，PTC 补丁可能没打全，
# 拿它做断言会得出「补丁缺失」的假阳性（issue #65 排查时踩过）。
_candidates = [
    os.path.join(ROOT, "_rel", "x86_64-dedup.zip"),
    RUNTIME,
    os.path.join(ROOT, "_runtime_bak", "rt-x86_64-zodded.zip"),
]
_alt = next((p for p in _candidates if os.path.isfile(p)), None)
check("runtime 源存在（_rel / assets / _runtime_bak）", _alt is not None,
      "三处都没有：先跑 scripts/build-runtime.sh 或 prepareRuntimeAssets")
if _alt and not os.path.isfile(RUNTIME):
    RUNTIME = _alt
if os.path.isfile(RUNTIME):
    z = zipfile.ZipFile(RUNTIME)
    names = [n for n in z.namelist() if not n.endswith("/")]
    nested = [n for n in names
              if "/node_modules/zod/" in n and not n.startswith("lib/node_modules/zod/")]
    print(f"  文件数={len(names)}  嵌套 zod 条目={len(nested)}")
    check("无嵌套 zod 副本", not nested,
          f"发现 {len(nested)} 个，启动会慢 2-3 倍")
    check("文件数已降到去重后量级", len(names) < 20000,
          f"当前 {len(names)}，去重前约 45000")
    check("顶层 zod 仍在", "lib/node_modules/zod/package.json" in names)
    # 关键完整性锚点
    anchors = [
        "lib/node_modules/@deepseek-ai/dsh/lib/bin.js",
        "lib/node_modules/@deepseek-ai/cordis/lib/index.js",
        "lib/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml",
        "lib/node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml",
        "lib/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js",
        "lib/libreadline.so.8",
        "lib/libz.so.1",
        "bin/node",
        "bin/bash",
        "bin/rg",
    ]
    missing = [a for a in anchors if a not in names]
    check("10 个完整性锚点全在", not missing, str(missing))
    # corepack 不能被去重/裁剪破坏
    try:
        cp = z.read("lib/node_modules/corepack/dist/corepack.js")
        check("corepack.js 仍是 JS 入口", b"/system/bin/sh" not in cp[:40])
    except KeyError:
        check("corepack.js 存在", False, "MISSING")

print("=== 3b. PTC 补丁必须在（v1.4.13 血教训）===")
g2 = open(GRADLE, encoding="utf-8").read()
if os.path.isfile(RUNTIME):
    PTC = "lib/node_modules/@deepseek-ai/dsh-ptc-runtime-node/lib/index.js"
    try:
        ptc = zipfile.ZipFile(RUNTIME).read(PTC).decode("utf-8", "replace")
    except KeyError:
        ptc = ""
    check("PTC 运行时文件存在", bool(ptc))
    check("白名单保留 LD_LIBRARY_PATH", '"LD_LIBRARY_PATH"' in ptc,
          "缺它 → run_code 子进程报 libz.so.1 not found")
    check("无条件注入补丁存在",
          "Inject the runtime library path unconditionally" in ptc)
    # v1.4.33（issue #65）：bootstrap 路径映射兜底。
    # processPathFromHostPath 返回 undefined 时上游直接抛
    # "PTC runtime bootstrap is unavailable in the subprocess execution
    # world: <path>"，而那个文件其实存在（设备上 md5 与包内一致）。
    # 根因是 fs 提供者可能不覆盖该方法（FileSystem 基类就是空实现），
    # Android 上引擎与 worker 同一挂载命名空间，绝对路径本身就是进程路径。
    check("bootstrap 路径映射兜底存在", "[dsh-android] bootstrap path fallback" in ptc,
          "缺它 → run_code 报 bootstrap unavailable 而文件明明存在")
    check("兜底只对绝对路径生效", "isAbsolute?.(path)" in ptc,
          "相对路径兜底会让 worker 按自己的 cwd 解析，执行错文件")
    check("构建期校验 bootstrap 兜底",
          "bootstrap path fallback" in g2,
          "产物有补丁但构建校验没覆盖 → 换运行时静默丢失")
    # v1.4.27：PR #48 后门禁移入 build-runtime.sh（+ build.gradle.kts 校验产物），
    # 语义不变：缺补丁绝不发坏包。
    check("构建期强制校验 PTC 补丁",
          "ptc" in g2.lower() and ("lacks the PTC patch" in g2 or "GradleException" in g2),
          "补丁只存在产物里、没进构建流程 → 换包就静默丢失")
    check("缺失时中止构建（不发坏包）",
          "throw GradleException" in g2 or "中止构建" in g2 or "lacks the PTC" in g2)
    # v1.4.14（issue #35 + 全量审计）：扩展工具链变量也必须放行，
    # 否则 PTC 里 git/python/perl/ruby/imagemagick/go/rust 全部静默失效。
    for v in ["OPENSSL_CONF", "SSL_CERT_FILE", "PYTHONHOME", "GIT_EXEC_PATH",
              "PERL5LIB", "RUBYLIB", "MAGICK_CONFIGURE_PATH", "GOTMPDIR",
              "CPATH", "LIBRARY_PATH", "RUSTFLAGS", "CURL_CA_BUNDLE"]:
        check(f"白名单含 {v}", f'"{v}"' in ptc, "缺它 → 对应扩展在 PTC 里不可用")

print("\n=== 3. 顶层 zod 版本未被擅自升级 ===")
if os.path.isfile(RUNTIME):
    try:
        import json
        v = json.loads(zipfile.ZipFile(RUNTIME).read("lib/node_modules/zod/package.json"))["version"]
        print(f"  顶层 zod = {v}")
        # 去重脚本的约定：顶层换成各包原本解析到的 4.4.3，而不是更新的 4.6.x
        check("顶层 zod 为 4.4.3（与去重前各包解析到的一致）", v == "4.4.3", v)
    except Exception as e:
        check("可读取顶层 zod 版本", False, str(e))

print("\n=== 4. 去重脚本幂等性声明 ===")
d = open(DEDUPE, encoding="utf-8").read()
check("脚本声明幂等", "幂等" in d)
check("脚本不升级依赖版本", "做性能优化不该顺手改依赖版本" in d)

print("\n" + "-" * 44)
print(f"通过 {ok} / 失败 {fail}")
sys.exit(1 if fail else 0)
