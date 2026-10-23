# DSH Mobile v1.4.14 更新公告（紧急）

**用 PTC 模式的宝宝请更新。** 顺便修了一批一直没被发现的问题。

## 🔴 PTC 报 OpenSSL 配置错误

有宝宝反馈：PTC 模式（`run_code`）一用就失败，报

```
OpenSSL configuration error: Permission denied
calling fopen(/data/data/com.termux/files/usr/etc/tls/openssl.cnf)
```

主引擎、Shell、普通工具都正常，只有 PTC 跑代码的子进程起不来。

## 原因

PTC 启动子进程时会把环境变量几乎清空，只留一份白名单。而引擎的 node 把 OpenSSL 配置目录**硬编码**成了 `/data/data/com.termux/...`。

**装了 Termux 的设备**：那个目录真实存在，但我们的沙箱读不了 → 权限错误 → 崩溃。
**没装 Termux 的设备**：目录不存在 → 自动回退 → 反而没事。

所以这个 bug 只在部分设备上出现，之前一直没被抓到。

## 顺手把整件事查了一遍

报障的宝宝指出的是 `OPENSSL_CONF`，但我们顺着把**所有**该传的变量都对了一遍，发现漏的不止一个 —— **13 个扩展工具链变量全都没传**：

| 类别 | 影响 |
|---|---|
| C/C++ 编译 | 头文件和库路径丢失，编译扩展会失败 |
| Python | 找不到标准库 |
| Perl / Ruby | 找不到模块 |
| git | 找不到子命令 |
| ImageMagick | 找不到配置 |
| curl / Go | 证书路径、构建临时目录丢失 |

也就是说：**在 PTC 里用这些扩展，之前大概率一直是坏的**，只是没人报。这一版一起修了，白名单从 7 个变量补到 28 个。

## 验证

写了个脚本从 PTC 源码里解析出真实白名单，按它构造环境、真跑一次子进程：

```
parsed allowlist size: 28
final env: LD_LIBRARY_PATH, OPENSSL_CONF, SSL_CERT_FILE
EXIT: 0 | OUT: WORKER-OK
```

能正常加载 TLS / HTTPS / 文件系统模块，退出码 0。

**说明一个测试局限**：模拟器上没有 Termux 目录，走的是「目录不存在」那条路，所以修复前在模拟器上也能过。只有真机装了 Termux 才会触发权限错误 —— 这也是这个 bug 藏这么久的原因。

## 其它

- 构建期强制校验从 2 项扩到 4 项，缺任何一项就中止构建，不会再发坏包
- 回归测试 272 项全过（新增 12 条专门盯这些变量的断言）

## 📦 安装

直接覆盖安装，**会话、工作区、凭据、插件全部保留**。

- 正式包：`DSH-Mobile-1.4.14-arm64-v8a.apk`
- 调试包：`DSH-Mobile-1.4.14-arm64-v8a-debug.apk`

APK：versionCode 265 / 1.4.14 / arm64-v8a，签名与之前一致。

## 💬 交流群

**QQ 群：1128769016**

特别谢谢报障的 @linshiqi137-web，诊断链写得非常清楚（移除变量能复现、加回去能恢复、模拟启动能通过），直接指到了根因。也谢谢群里一直在反馈的各位喵～
