#!/usr/bin/env python3
"""issue #65 回归护栏：root 模式下 pnpm 锁目录的属主不能被 chown 掉。

## 事件

用户（KernelSU，`DSH_ANDROID_PRIV_MODE=root`）报：插件页点任何插件的「卸载」
都失败，所有插件一样：

    ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK
    lock directory must be a real directory owned by the current user:
    .../dsh-home/.cache/pnpm-store-operation-locks-0

**每次重启引擎都复发**，手动改回属主只能撑到下一次启动。

## 根因

pnpm 把操作锁建在 `$HOME/.cache/pnpm-*-locks-<uid>` 这类**按 uid 分后缀**的目录
里。引擎以 root 跑时用的是 `...-locks-0`；App 主进程是普通 uid。而
`Privilege.fixHomeOwnership()` 在每次启动引擎时对整棵 `dsh-home` 递归
`chown -R <appUid>:<appUid>` —— 把 root 那一套锁目录也改成了 app uid，于是
root 身份的 pnpm 认为「锁目录不属于我」，拒绝使用。

## 守卫

`fixHomeOwnership` 必须在递归 chown 之后，把 `.cache` 下 pnpm 锁/交换目录的
属主**还原成各自的数字后缀**（`-0` → root，`-<appUid>` → app）。这样两个身份
各拿自己那份，互不干扰。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRIV = os.path.join(ROOT, "app", "src", "main", "java", "app", "dsh", "mobile",
                    "engine", "Privilege.kt")

passed = 0
failed = 0


def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print("PASS  %s" % name)
    else:
        failed += 1
        print("FAIL  %s%s" % (name, ("  -> " + detail) if detail else ""))


src = open(PRIV, encoding="utf-8").read()

# 1) 修复存在
check("fix: 提及 issue #65 的 pnpm 锁属主还原",
      "#65" in src and "pnpm" in src.lower(),
      "root 模式下 chown -R 会把 pnpm 的 uid 后缀锁目录改错属主")
check("fix: 遍历 .cache 下的 pnpm 锁目录",
      "pnpm-*-locks-*" in src,
      "缺它 → root 模式的 pnpm 锁被 chown 成 app uid，装卸插件必失败")
check("fix: 也覆盖 swaps 目录",
      "pnpm-*-swaps-*" in src,
      "pnpm 模块交换目录同样是按 uid 分后缀")

# 2) 属主按后缀还原，而不是一律改回 app uid
check("fix: 从目录名后缀取 uid",
      "n=${d##*-}" in src or "n=\\${d##*-}" in src,
      "必须用目录名的数字后缀当属主，否则仍然是「一律 app uid」")
check("fix: 非数字后缀跳过",
      "[!0-9]" in src,
      "防止把非 uid 后缀的目录 chown 成非法值")
check("fix: chown 到该后缀对应的 uid:gid",
      'chown "$n:$n"' in src or 'chown \\"$n:\\$n\\"' in src or 'chown \\"\\$n:\\$n\\"' in src,
      "需同时设 user 和 group，否则 pnpm 仍报 owned-by 检查失败")

# 3) 顺序：递归 chown 之后才还原
i_bulk = src.find("chown -R ")
i_restore = src.find("pnpm-*-locks-*")
check("order: 先整树 chown，再还原锁目录属主",
      i_bulk != -1 and i_restore != -1 and i_bulk < i_restore,
      "顺序反了会被随后的 chown -R 覆盖，等于没修")

# 4) 仍然保留原有的关键行为，避免修 #65 时破坏别的自愈
check("keep: 仍对 engine 目录补 u+rwX",
      "chmod -R u+rwX" in src,
      "重装后新 uid 读不了插件，缺这条引擎插件全哑")
check("keep: 仍 restorecon 重置 SELinux 标签",
      "restorecon -R" in src)

# 5) 命令拼接不能引入未转义的 Kotlin 模板
check("safety: shell 变量在 Kotlin 字符串里已转义",
      '\\$d' in src and '\\$n' in src,
      "未转义的 $d/$n 会被 Kotlin 当模板求值 → 编译失败或命令错")

print("\n" + "-" * 44)
print("通过 %d / 失败 %d" % (passed, failed))
sys.exit(1 if failed else 0)
