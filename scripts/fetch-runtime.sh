#!/usr/bin/env bash
# fetch-runtime.sh —— 获取预构建 runtime.zip（android-build 的 fetch-runtime job 用）。
#
# 为什么不再现场编译：runtime 内容只取决于 Termux 仓库包版本 + 本仓库 runtime
# 脚本。此前每次 push/PR/定时都 apt 收集 + 打补丁 + 打包 127MB×2，耗时 5-10 分钟，
# 且 Termux 仓库浮动导致同一 commit 两次构建 sha 不同（不可复现）。改造后按优先级
# 取预构建产物：
#
#   ① 滚动 prerelease tag "runtime"（.github/workflows/runtime-build.yml 维护）
#      下载 runtime-<abi>.zip + runtime-meta-<abi>.json，校验 sha256 一致；
#   ② releases/latest（正式 tag 发布自带的 runtime-<abi>.zip；gh 默认排除
#      prerelease/draft，所以不会误取 preview/edge/runtime 这些滚动包）
#      meta 从 zip 内 BUILD.json + 文件哈希重建（scripts/make-runtime-meta.py）；
#   ③ 本地兜底构建（scripts/build-runtime.sh）—— 前两级全缺失时（v1.4.27 之前的
#      历史版本、新 fork bootstrap）保证 CI 不因缺少 runtime 直接红。
#
# 任一级命中并通过校验即返回；三级全失败才算失败。输出会写进 Step Summary。
# 需要：Linux + gh CLI（GH_TOKEN）+ python3 + unzip/sha256sum。
#
# 用法: fetch-runtime.sh --abi arm64-v8a|x86_64 --out runtime.zip --meta runtime-meta.json
set -euo pipefail

ABI=""
OUT=""
META=""

usage() {
  echo "usage: $0 --abi arm64-v8a|x86_64 --out <zip> --meta <json>" >&2
  exit 2
}
while [ $# -gt 0 ]; do
  case "$1" in
    --abi) ABI="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    --meta) META="${2:?}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done
[ -n "$ABI" ] && [ -n "$OUT" ] && [ -n "$META" ] || usage
case "$ABI" in
  arm64-v8a|x86_64) ;;
  *) echo "unsupported abi: $ABI (arm64-v8a|x86_64)" >&2; exit 2 ;;
esac

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY not set (run inside GitHub Actions)}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
OUT="$(realpath -m "$OUT")"
META="$(realpath -m "$META")"
WORK="$(mktemp -d)"
# 清理失败不得影响脚本退出码（否则成功路径也会被 trap 带成非 0）
trap 'rm -rf "$WORK" || true' EXIT

source_note() {
  echo "source: $1" | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
}

verify_pair() {
  # meta.sha256 必须等于 zip 文件哈希，否则视为该级来源不可用
  local zip="$1" meta="$2" want got
  [ -f "$zip" ] && [ -f "$meta" ] || return 1
  want="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["sha256"])' "$meta")"
  got="$(sha256sum "$zip" | cut -d' ' -f1)"
  if [ "$want" != "$got" ]; then
    echo "warn: sha256 mismatch — meta=$want actual=$got" >&2
    return 1
  fi
  return 0
}

echo "== fetch-runtime =="
echo "abi:    $ABI"
echo "repo:   $REPO"

# ---- ① 滚动 prerelease tag "runtime" ----
echo "-- tier 1: prerelease tag runtime"
if gh release download runtime --repo "$REPO" \
     --pattern "runtime-${ABI}.zip" \
     --pattern "runtime-meta-${ABI}.json" \
     --output-dir "$WORK" --clobber 2>/dev/null; then
  if [ -f "$WORK/runtime-${ABI}.zip" ] && [ -f "$WORK/runtime-meta-${ABI}.json" ]; then
    mv "$WORK/runtime-${ABI}.zip" "$OUT"
    mv "$WORK/runtime-meta-${ABI}.json" "$META"
    if verify_pair "$OUT" "$META"; then
      source_note "runtime prerelease（tag runtime，sha256 已校验）"
      echo "done (tier 1)"
      exit 0
    fi
    echo "warn: tier 1 产物不一致，降级到 tier 2" >&2
  else
    echo "warn: tier 1 资产不全（缺 zip 或 meta），降级到 tier 2" >&2
  fi
else
  echo "warn: tier 1 不可用（无 runtime release 或下载失败），降级到 tier 2" >&2
fi
rm -f "$OUT" "$META"

# ---- ② releases/latest（正式发布自带 runtime zip）----
echo "-- tier 2: releases/latest"
if gh release download --repo "$REPO" \
     --pattern "runtime-${ABI}.zip" \
     --output-dir "$WORK" --clobber 2>/dev/null \
   && [ -f "$WORK/runtime-${ABI}.zip" ]; then
  mv "$WORK/runtime-${ABI}.zip" "$OUT"
  python3 "$SCRIPT_DIR/make-runtime-meta.py" "$OUT" "$META"
  if verify_pair "$OUT" "$META"; then
    source_note "releases/latest（meta 由 zip 内 BUILD.json 重建）"
    echo "done (tier 2)"
    exit 0
  fi
  echo "warn: tier 2 重建 meta 校验失败，降级到 tier 3" >&2
else
  echo "warn: tier 2 无 runtime-${ABI}.zip，降级到 tier 3" >&2
fi
rm -f "$OUT" "$META"

# ---- ③ 本地兜底构建 ----
echo "-- tier 3: 本地兜底构建（build-runtime.sh）"
chmod +x "$SCRIPT_DIR/build-runtime.sh" "$SCRIPT_DIR/collect-termux-runtime.sh"
"$SCRIPT_DIR/build-runtime.sh" --abi "$ABI" --out "$OUT"
mv "${OUT%.zip}.json" "$META"
verify_pair "$OUT" "$META" || { echo "error: 兜底构建产物与 meta 不一致" >&2; exit 1; }
source_note "本地兜底构建（前两级来源均缺失，如新 fork bootstrap）"
echo "done (tier 3)"
