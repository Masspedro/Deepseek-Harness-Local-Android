# DSH Mobile 宣传视频：素材清单

> 采集时间：2026-10-28 · 设备：Android 16 x86_64 模拟器（1080 × 2400 / 420 dpi）
> 全部素材均为**真实录屏与截图**，无合成、无 AI 生成画面。

## 一、视频素材（mp4）

| 文件 | 大小 | 时长 | 内容 | 建议用法 |
|---|---|---|---|---|
| `coldstart.mp4` | 1.25 MB | ~28 s | 冷启动全过程：启动遮罩 → 真实解压进度 / 阶段文案 → 引擎就绪 → 主界面 | **开篇核心镜头**。可加速 4~8×，把 3 秒级冷启动压成 2~3 秒画面；配「3.4 s」大字幕 |
| `ui-flow.mp4` | 3.81 MB | ~35 s | 设置页滚动 → 扩展中心（21 项一览）→ 上滑滚动 | **中段能力展示**。可切 2~3 段特写（扩展列表、设置分区） |
| `chat-attempt1.mp4` / `chat-attempt2.mp4` | 各 814 KB | ~170 s | 输入任务提示词的过程（含键盘、工作区选择、模型选择器） | **可用但有缺陷**：消息未成功发出（详见文末「已知问题」）。适合只截「输入 → 点发送」的前 3~4 秒 |

## 二、静态截图（png，1080 × 2400）

| 文件 | 内容 | 建议用法 |
|---|---|---|
| `00-splash.png` | 启动遮罩：`Extracting the runtime…` + 文件数进度 + 阶段文案 | 冷启动段落的静帧强调 |
| `01-main.png` | 主界面（灵动岛工具栏 + 侧栏图标 + `Engine ready`） | 常驻背景层 / 终点构图 |
| `02-settings.png` | 设置页顶部：外观 / 朝向 / 缩放 / 隐藏状态栏 / 文件目录 / 主题色 / 布局 | 「原生竖屏 UI」段落 |
| `03-settings-scrolled.png` | 设置页中部：扩展中心 / 社区插件 / 本地识别 / 桌宠 / 数据与会话 | 「扩展生态」段落 |
| `04-extensions.png` | **扩展中心全貌**：`x86_64 device · 0 of 21 activated` + Python/JDK/Go/Rust/Ruby/PHP/Lua 卡片 | **关键素材**。21 项扩展一览，最有说服力的一帧 |
| `05-plugins.png` | 社区插件市场：`3540` + 23 分类 chips + 插件卡片 | **关键素材**。3540 这个数字要放大强调 |
| `06-chat-empty.png` / `08-welcome.png` | 欢迎页 `Into the Unknown` + 工作区选择 + 模型选择器（`DeepSeek-V4.1-Flash`） | 「装完即用」段落 |
| `07-chat.png` / `09-main-clean.png` | 主界面干净版（无弹窗） | 背景层 |

## 三、设计资产（可直接复用于 Remotion 绘制）

### 品牌

- **Logo**：`docs/promo/source/ic_launcher_foreground.xml`（矢量，鲸鱼 + 深蓝圆底）
- **主视觉**：`docs/promo/dsh-mobile-github.png`（1600×900 已有成品）
- **社交预览**：`docs/promo/dsh-mobile-social.png`（1280×640）

### 色彩令牌（取自 `values-night/colors.xml`，深色主题为视频主色）

| 用途 | 值 | 说明 |
|---|---|---|
| 背景 `bg` | `#FF101418` | 近黑深蓝，主背景 |
| 表面 `surface` | `#FF161D29` | 卡片 |
| 表面次级 `surface_alt` | `#FF1B2330` | 分层卡片 |
| 主文字 `text_primary` | `#FFF2F5F9` | 标题 |
| 次文字 `text_secondary` | `#FF9CA3AF` | 正文 |
| 弱文字 `text_muted` | `#FF6B7684` | 辅助 |
| **强调色 `accent`** | `#FF7DD3FC` | **天蓝，品牌主色**（用户明确要求默认回天蓝） |
| 强调次色 `accent_alt` | `#FFA78BFA` | 紫，点缀 |
| 成功 `success` | `#FF6EE7B7` | 薄荷绿，状态 |
| 警告 `warning` | `#FFF2B36B` | 琥珀 |
| 危险 `danger` | `#FFFF8A80` | 珊瑚红 |
| 分割线 `divider` | `#22FFFFFF` | 12% 白 |

### 字体

- 中文：微软雅黑（`C:/Windows/Fonts/msyh.ttc`）
- 英文/数字：Segoe UI（`segoeuib.ttf` / `segoeuil.ttf`）
- 等宽（终端画面）：Consolas（`consola.ttf`）

## 四、事实数据（字幕/数字动画的唯一来源，不可编造）

### 性能

| 指标 | 数值 | 出处 |
|---|---|---|
| 冷启动（旗舰真机，一加 15T / Android 16） | **3.4 秒** | 用户真机实测 |
| 冷启动（主流中端机） | **5 ~ 6 秒** | 用户实测 |
| 冷启动（紫光展锐手表，3 GB 内存） | **13 秒** | 用户实测 |
| 冷启动（模拟器 x86_64 / 2.5 GB） | **2.2 ~ 2.7 秒** | 本机三次 `am start -W` |
| 内存 PSS（引擎 + 多服务并行） | **< 400 MB** | 实测 |

### 规模

| 项 | 数值 | 出处 |
|---|---|---|
| 运行时文件数 | **14572** | `_rel/arm64-dedup.zip` 统计 |
| 运行时解压后 | **404 MB** | 同上 |
| 运行时压缩后 | **~125 MB** | 同上 |
| 环境扩展 | **21 项** | `assets/extensions/catalog.json` |
| 社区插件 | **3540 个** | `assets/market/catalog.json` |
| 插件分类 | **23 个** | 同上 |
| 支持 Android | **8.0 → 16** | `minSdk 26` |
| APK 体积 | 完整包 **~150 MB** / 简单包 **~24 MB** | Release 实测 |
| 原生 C 代码（PTY） | **581 行** | `dsh_pty.c` + `dsh_pty_exec.c` |
| Android 适配补丁 | **14 个** | `scripts/patch-*.py` |
| 回归探针 | **16 项** | `scripts/probes/_test_*.py` |

### 对比数据（路线对照，来自 README）

| 方案 | 与引擎之间的层 | 冷启动 |
|---|---|---|
| Termux 手动配置 | Perl/bash 启动链 + apt + 环境初始化 | 分钟级 |
| proot + Ubuntu | 内核 → proot → glibc → 发行版 → Node | 十几秒起，部分设备起不来 |
| 冻结快照 | 解压 rootfs → 修补路径 → 启动 | 数十秒 |
| **DSH Mobile** | **直接 `execve` bionic Node** | **3 秒级** |

## 五、文案（已定稿，可直接用）

### 主张

- 主标语：**DeepSeek Harness. Now in your pocket.**
- 中文定位：**完整 Agent 引擎，在 Android 上原生运行。**
- 三不要：**No Root · No Termux · No PC**
- 核心差异：**没有中间层**

### 禁用表述（合规红线，**绝不能出现**）

- ❌ 完全离线大模型
- ❌ 所有数据永不离开设备（模型请求会出设备，取决于用户配置的 API）
- ❌ 任何「破解」「绕过」「越狱」类暗示
- ❌ 宣称支持 iOS / 桌面（本项目只做 Android）

## 六、已知问题

### 真实对话录屏未成功

`chat-attempt1/2.mp4` 里消息**没有真正发出**：输入框已清空、点过发送按钮，但会话未落盘、界面无回复。

**已排除**：
- 网络：引擎侧 `curl https://api.deepseek.com/` 返回正常 JSON（`Authentication Fails (missing key)` 说明链路通）
- API key：已在界面填入并保存（掩码显示，未泄漏）

**未定位**：WebView 侧发送动作是否真正触发。可能是 release 包（`targetSdk 28`）+ 模拟器 WebView 的组合问题，需单独排查。

**处理建议**：视频里**不要**使用这两段录屏作为「AI 真实回应」的证据。如需对话画面，改用 Remotion 代码绘制（见提示词里的备选方案），或后续在真机上补录。

### 截图里的系统状态栏

所有截图顶部有模拟器的状态栏（时间 / 5G / 电量）。Remotion 里建议**裁掉顶部 100px** 或叠加自己的状态栏样式。

## 七、素材使用约束

1. **不伪造 UI**：截图只做缩放、裁剪、圆角、阴影，不得改动界面内容（文字、图标、布局）
2. **数字必须有出处**：所有性能/规模数字只能取本文档「事实数据」表
3. **不蹭他人品牌**：不要出现 DSHA、proot、Termux 的 logo；对比只用文字方案名
4. **时长控制**：30~45 秒（B 站/抖音竖屏 9:16，兼顾 GitHub README 嵌入的横屏版本）
