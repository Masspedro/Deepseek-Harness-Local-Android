# 内置 SSH 远程工作区（@tiphareth/dsh-hardssh）

DSH Mobile 默认内置 [@tiphareth/dsh-hardssh](https://github.com/tiphareth0/dsh-hardssh)：
手机直连服务器，把远端目录当作工作区改代码、跑测试、查日志，不需要在手机上另装插件。

> **源码不进本仓库。** 构建时由 CI 从 GitHub 固定提交拉取源码并编译，产物随
> `runtime.zip` 打进 APK（见 [android-build.yml](../.github/workflows/android-build.yml)
> 的 `build-hardssh-plugin` job）。本仓库只保留打包/注入脚本与 App 侧启用逻辑。

## 入口

| 位置 | 能力 |
|---|---|
| 左侧栏「SSH 工作区」 | 添加服务器（或从 `~/.ssh/config` 导入）、绑定远端目录为工作区 |
| 右侧栏「SSH」 | Web 终端（xterm + WebSocket PTY）、文件上传下载、本地端口转发、当前服务器命令 |
| Agent 工具 | `ssh_list` / `ssh_exec` / `ssh_upload` / `ssh_download` / `ssh_tunnel` / `ssh_cluster` |
| Agent 工具 | `remote_ls` / `remote_search` / `remote_status`（显式远程工作区操作） |

## 绑定工作区后改代码、跑验证

把某台服务器的目录绑定为 SSH 工作区后，**该会话里的原生工具自动跑在远端**：

| 工具 | 行为 |
|---|---|
| `read` / `write` / `edit` | 经 `ctx.fs` 接缝路由到远端工作区 |
| `bash` | 经 `ctx.subprocess` 接缝在远端执行（编译、测试、git 都在服务器上跑） |
| `glob` / `grep` | 搜索桥：宿主机有 ripgrep 就发同一条 argv，否则由远端搜索阶梯代答 |
| `remote_*` | 显式远程运维：列目录、检索、查看绑定状态 |

这正是「手机当终端、算力留在服务器」的用法：APK 只负责界面与调度，代码和构建都在远端。

## 集成原理（为什么开箱可用）

1. **构建期**：CI 的 `build-hardssh-plugin` job 按 `HARDSSH_REF` 检出源码 →
   `pnpm install` + `pnpm build` → `scripts/pack-hardssh-plugin.sh` 组装出
   `package.json` / `lib/*.js` / `cordis.patch.yml` / 依赖（`ssh2`、`ws`）。
   `ssh2` 的原生加速是可选的，打包时用 `--omit=optional` 排除，Android 上走纯 JS 回退。
2. **打包期**：`scripts/inject-hardssh-plugin.sh` 把它放进 runtime 的
   `lib/node_modules/@tiphareth/dsh-hardssh`，与引擎同生命周期（升级 runtime 即升级插件）。
3. **启动期**（`EngineConfig.ensureBundledSshPlugin`）：
   - 在 `$DSH_HOME/profiles/node_modules/@tiphareth/dsh-hardssh` 建一条指向引擎目录的链接，
     让 dsh 的 Loader 能从 web profile 解析到插件名（不复制文件）；
   - 把插件自带的 `cordis.patch.yml` 作为**第一个 `--patch` 层**传给引擎：
     它会禁用内置的 `fs-sandbox` / `subprocess` 行，插入 `hardssh` / `hardssh-fs` /
     `hardssh-subprocess` 三个接缝实现；Android 适配覆盖层随后应用，保持既有行为；
   - 插件缺失、链接失败或用户已用社区插件中心装过同名插件时自动跳过，
     引擎与其它功能照常启动（不会因为内置能力失败而起不来）。

## 升级插件

只改一个地方：`.github/workflows/android-build.yml` 顶部的 `HARDSSH_REF`（commit SHA 最稳，
也接受 tag / 分支），推上去由 CI 重新构建。运行期不需要联网安装。

## 安全边界

- SSH 主机与凭据存于应用私有目录（`$DSH_HOME/dsh-ssh.json`，0600）；默认不落盘密码，
  `secretStorage: vault` 时才加密保存。
- 插件的 REST 路由（`/api/dsh-ssh/*`、`/api/dsh-hardssh/*`）仅限回环并做同源校验。
- 引擎只监听 `127.0.0.1`；远程访问能力来自**出站** SSH 连接，不会把手机变成公开入口。
- 远端路径收敛在绑定的 `remoteRoot` 内；相对路径禁止 `..`，符号链接逃逸按错误拒绝。

## 排障

- 设置 → 自检：若出现 SSH 相关告警，先确认 runtime 里插件文件存在：
  `files/engine/lib/node_modules/@tiphareth/dsh-hardssh/package.json`。
- `engine.log` 里搜 `hardssh`：加载失败会以
  `warning: N entries did not activate` 的形式列出具体行（不会阻断引擎启动）。
- 插件未启用时，左侧栏不会出现「SSH 工作区」入口，右侧栏也没有「SSH」标签。
- 旧 WebView（< Chrome 85）无法运行引擎前端本身；插件端同样受此限制。

## 已知限制

- **SSH 的可选原生加速件没有打进包**：ssh2 有两个可选原生组件 —— `cpu-features`
  （只用于挑选默认 cipher 列表，不影响功能）和 `sshcrypto.node`（AES-GCM /
  ChaCha20 的 C++ 批处理实现）。打包时用 `--omit=optional --ignore-scripts`
  排除了它们，原因有两个：CI 跑在 Linux x86_64 上，直接装进来的是**宿主架构**的
  `.node`，在 arm64 Android 上 dlopen 必失败；而运行时又删掉了 Node 头文件
  （`include/`），开箱状态下无法用 node-gyp 在手机上重编。
- **没有这两个组件时 SSH 仍然可用**：ssh2 会自动回退到 Node 内置的 `crypto`
  （OpenSSL 的 C++ 实现）做 AES-GCM / ChaCha20，纯 JS 的只是 SSH 协议分帧。
  也就是说不是「纯 JS 加解密」，而是少了 ssh2 的 C++ 批处理加速层，吞吐通常
  略低于桌面，但一般不是实际瓶颈。
- **运行基座能装什么**：Extension Center 可以从 Termux 仓库装 clang / make /
  cmake / python 等工具链扩展；但这些工具链解决的是「编译用户自己的程序」。
  要在设备上重建 ssh2 的原生 binding，还缺与 Termux Node 完全匹配的头文件和
  bionic 交叉编译支持，属于上游不保证的路径 —— 需要极致吞吐时，正确做法是在
  CI 里按 Android ABI 交叉编译后随 runtime 发布，而不是在手机上现编。
- 大文件传输建议走 `ssh_upload` / `ssh_download` 的流式 SFTP，或在远端用
  `ssh_exec` 跑 `tar` / `rsync` / `scp`，让压缩与复制发生在服务器侧。
- WebView 版本要求与主界面一致（Chrome 85+；官方建议更高）。
- SSH 连接消耗真实远端资源：大范围搜索、批量命令、`ssh_cluster` 会并发打到服务器上。
