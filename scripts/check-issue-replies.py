#!/usr/bin/env python3
"""扫描 issue/PR 中用户在我们最后回复之后的留言（未跟进检测）。

用法：
    GITHUB_TOKEN=xxx python scripts/check-issue-replies.py [--hours 168]

输出每个仍有未跟进留言的 issue：编号、留言人和摘要。
配合例行节奏：每次发布前跑一遍（见 AI_CONTEXT「例行清单」）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request

API = "https://api.github.com"


def get(token: str, path: str):
    req = urllib.request.Request(
        API + path,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "User-Agent": "dsh-android-check",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"[]")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default="Soodok/Deepseek-Harness-Local-Android")
    ap.add_argument("--hours", type=float, default=168.0,
                    help="只报告最近 N 小时内有新留言的（默认 168 = 一周）")
    a = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("需要 GITHUB_TOKEN 环境变量", file=sys.stderr)
        return 2

    cutoff = None
    if a.hours > 0:
        import datetime
        cutoff = (datetime.datetime.now(datetime.timezone.utc)
                  - datetime.timedelta(hours=a.hours)).strftime("%Y-%m-%dT%H:%M:%SZ")

    issues = get(token, f"/repos/{a.repo}/issues?state=all&per_page=100&sort=updated&direction=desc")
    pending = []
    for it in issues:
        if "pull_request" in it:
            continue
        num = it["number"]
        try:
            cs = get(token, f"/repos/{a.repo}/issues/{num}/comments?per_page=100")
        except Exception:
            continue
        ours = [c["created_at"] for c in cs if c["user"]["login"] == "Soodok"]
        ours_last = max(ours) if ours else None
        after = [c for c in cs
                 if (ours_last is None or c["created_at"] > ours_last)
                 and (cutoff is None or c["created_at"] >= cutoff)]
        if after:
            pending.append((num, it["title"], after))

    if not pending:
        print("无未跟进留言。")
        return 0

    print(f"发现 {len(pending)} 个 issue 有未跟进留言：\n")
    for num, title, after in pending:
        print(f"#{num}  {title}")
        for c in after:
            body = c["body"].replace("\n", " ")[:90]
            print(f"   @{c['user']['login']} {c['created_at'][:16]}: {body}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
