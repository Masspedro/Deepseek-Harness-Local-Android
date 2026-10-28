export type VolumeRow = {
  id: string;
  label: string;
  value: number;
  ours?: boolean;
  approximate?: boolean;
  note?: string;
};

export const film = {
  fps: 60,
  seconds: 44,
  portrait: {width: 1080, height: 1920},
  landscape: {width: 1920, height: 1080},
  shots: [
    {id: 'hook', start: 0, seconds: 4},
    {id: 'path', start: 4, seconds: 6},
    {id: 'scale', start: 10, seconds: 9},
    {id: 'shell', start: 19, seconds: 5},
    {id: 'ecosystem', start: 24, seconds: 5},
    {id: 'depth', start: 29, seconds: 8},
    {id: 'end', start: 37, seconds: 7},
  ],
} as const;

// Product figures are a snapshot of MATERIALS.md, not live catalogue values.
export const facts = {
  startup: {seconds: 3.4, device: '一加 15T · Android 16', source: '用户真机实测'},
  recording: {speed: 7, label: '模拟器启动过程 · 7× 加速', note: '画面与真机实测分属不同设备'},
  ecosystem: {extensions: 21, plugins: 3540, categories: 23},
  runtime: {files: 14572, extractedMb: 404},
  engineering: {modules: 54, kotlinFiles: 102, lines: 43185, patches: 14, ptyLines: 581, probes: 16},
  shell: {
    dex: [
      {id: 'ours', label: 'DSH Mobile', value: 9.3, ours: true},
      {id: 'guzhou', label: 'guzhou079', value: 0.7, ours: false},
      {id: 'woaiys', label: 'woaiys3', value: 0.6, ours: false},
    ],
    coverage: 10,
    sampledCoverage: '3–5 项',
  },
  install: [
    {id: 'dph', label: 'dphmoblie', value: 392},
    {id: 'dsha', label: 'DSHA', value: 279},
    {id: 'woaiys', label: 'woaiys3', value: 155},
    {id: 'full', label: '本作 · 完整包', value: 149, ours: true},
    {id: 'guzhou', label: 'guzhou079', value: 118},
    {id: 'box', label: 'DSHBox', value: 112},
    {id: 'root', label: 'dsh-phone-root', value: 41, note: '+ 需另装 Termux'},
    {id: 'lite', label: '本作 · 简单包', value: 24, ours: true, note: '+ 首启下载 128 MB'},
  ] satisfies VolumeRow[],
  firstUse: [
    {id: 'dph', label: 'dphmoblie', value: 392},
    {id: 'dsha', label: 'DSHA', value: 279},
    {id: 'woaiys', label: 'woaiys3', value: 155},
    {id: 'ours', label: '本作 · 任一种包', value: 150, approximate: true, ours: true},
    {id: 'guzhou', label: 'guzhou079', value: 118},
    {id: 'box', label: 'DSHBox', value: 112},
    {id: 'root', label: 'dsh-phone-root', value: 41, note: '+ Termux App，另计'},
  ] satisfies VolumeRow[],
  extracted: [
    {id: 'dph', label: 'dphmoblie', value: 1297},
    {id: 'woaiys', label: 'woaiys3', value: 462},
    {id: 'dsha', label: 'DSHA', value: 440},
    {id: 'ours', label: '本作', value: 404, ours: true},
    {id: 'guzhou', label: 'guzhou079', value: 370},
  ] satisfies VolumeRow[],
  domains: [
    {name: '引擎与运行时', count: 9}, {name: '插件与扩展', count: 7},
    {name: '会话与数据', count: 7}, {name: '无障碍与视觉', count: 8},
    {name: '语音', count: 7}, {name: '网络与远程', count: 6},
    {name: '终端', count: 3}, {name: '桌宠', count: 7},
  ],
} as const;

export const copy = {
  brand: 'DSH Mobile',
  hook: {eyebrow: 'ANDROID. NATIVE.', title: ['完整 Node.js', 'Agent 引擎。'], sub: '在 Android 上原生运行。', metric: '冷启动 → 引擎就绪', noLayer: '不用先搭一套 Linux。'},
  path: {
    eyebrow: 'LESS BETWEEN YOU AND THE ENGINE', title: ['把路径，', '拉成直线。'], sub: '从应用到 Node，少掉准备工作的中间层。',
    routes: [
      {name: 'Termux 手动配置', nodes: ['内核', 'Perl / bash', 'apt', '环境初始化', 'Node']},
      {name: 'proot + Ubuntu', nodes: ['内核', 'proot 翻译', 'glibc', '完整发行版', 'Node']},
      {name: '冻结快照', nodes: ['内核', '解压 rootfs', '路径重定位', 'Node']},
    ],
    native: 'bionic 原生直跑', nativeNodes: ['Android 内核', 'bionic Node'], syscall: 'execve()',
    shared: 'bionic 直跑不止我们一家', peers: '本作 / guzhou079 / woaiys3', disclaimer: '路线结构示意 · 未做竞品同条件性能测试',
  },
  scale: {
    eyebrow: 'THE COMPLETE PICTURE', title: '体积，完整地看。', sub: '安装包、首次下载、解压占用，各说各的。',
    charts: ['安装包体积', '首次可用总下载量', '解压后磁盘占用'],
    units: ['用户点下载时', '用户真正付出的流量', '运行时 / payload 口径'],
    honest: '我们不是最小的。', installNote: '简单包 24 MB + 首启下载 128 MB',
    downloadNote: '完整包 149 MB；简单包首次约 152 MB。',
    rankNote: '按上表从大到小，本作排第 4。', unknownNote: 'DSHBox 解压占用未知，未纳入。',
    source: '抽查 APK 版本快照 · 详见 MATERIALS.md',
  },
  shell: {
    eyebrow: 'SAME ENGINE. NATIVE CONNECTIONS.', title: ['引擎相同。', '路，铺得更完整。'], sub: '差别在引擎想做事时，Android 能否接得住。',
    engine: '官方 dsh 引擎', intent: '终端 · 读屏 · 远程',
    bridges: [
      {name: '真 PTY', detail: 'openpty → 原生 C 助手', library: 'libdsh_pty_exec.so'},
      {name: '自带 OCR', detail: '屏幕 → MLKit', library: 'libmlkit_google_ocr_pipeline.so'},
      {name: '内置 SSH', detail: '工作区 → 服务器', library: 'ssh2'},
    ],
    dexTitle: '同为 bionic 路线 · dex 体量', dexNote: '代码体量是工程规模证据，不是性能评分。',
    coverageOurs: '我们的实现覆盖', coverageSample: '抽查竞品', lowerBound: '特征匹配，下界估计；未匹配到不等于没有。',
  },
  ecosystem: {
    eyebrow: 'A WORKSTATION IN YOUR POCKET', title: ['环境与生态，', '一起带走。'], sub: '原生扩展中心，接上整个 dsh 插件生态。',
    extensions: '环境扩展', plugins: '社区插件', categories: '分类', extensionTag: 'EXTENSION CENTER', pluginTag: 'COMMUNITY PLUGINS',
    note: '真实截图 · 目录快照，不代表全部插件兼容 Android',
  },
  depth: {
    eyebrow: 'DETAILS MAKE IT WORK', title: ['看得见的流畅，', '看不见的工程。'],
    moduleLabel: '核心模块', filesLabel: 'Kotlin 文件', linesLabel: '代码行', networkNote: '按实际领域模块数绘制',
    swapTitle: '运行时换装 · 两阶段提交', swapNote: '逐条换名；旧版保留到引擎健康确认。',
    states: [
      {code: 'staging', label: '解压 + 校验'}, {code: 'swap', label: '先写意图日志'},
      {code: 'rename', label: '逐条换名'}, {code: 'committed', label: '写入提交状态'},
      {code: 'Healthy', label: '确认后清理旧版'},
    ],
    recovery: '中断 → 下次启动恢复', committedRecovery: '提交后中断 → 前滚收尾',
    metrics: ['Android 补丁', '行 C · 真 PTY', '回归探针'],
  },
  end: {
    eyebrow: 'DSH MOBILE', headline: ['DeepSeek Harness.', 'Now in your pocket.'],
    positioning: '完整 Agent 引擎，在 Android 上原生运行。', no: ['No Root', 'No Termux', 'No PC'],
    ready: '完整包装完即用 · 无需二次下载', android: 'Android 8.0 → 16', cta: '获取 Android 完整包',
    host: 'github.com/Soodok', repository: 'Deepseek-Harness-Local-Android',
    url: 'https://github.com/Soodok/Deepseek-Harness-Local-Android/releases/latest',
    boundary: '社区移植 · 模型请求使用你配置的 API',
  },
  units: {mb: 'MB', seconds: 's', item: '项', plugin: '个', file: '个', line: '行'},
} as const;
