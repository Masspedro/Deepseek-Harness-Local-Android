/**
 * dsh-android-shell-overrides —— 对手机版 WebUI 的二改覆盖层（v1.4.23）。
 *
 * ## 为什么要这一层
 *
 * 社区移植包（dsh-web-mobile）把 WebUI 重排成了手机形态，但它的做法是：侧栏
 * `position:absolute` + `transform:translateX(-110%)`，默认整个推进屏幕外，只在
 * 标题旁留一个按钮唤出抽屉。宝宝反馈「原本旁边的快捷栏都没了」——快捷栏（会话/
 * 文件/设置入口那一列）正是这样消失的。
 *
 * 这个覆盖层不改上游插件文件（保持可升级），而是在它之后追加一份 CSS：
 *
 *  · **侧栏恢复常驻窄栏**：取消 transform、改回 grid 的一列、固定 72px 宽，
 *    图标纵向排列——即回到桌面版的「快捷栏」形态，但只保留图标以适应手机宽度；
 *  · **抽屉唤出按钮在窄栏模式下隐藏**（不再需要），文件按钮保留；
 *  · **上游其余优化全部保留**：底部输入条、全屏面板、头部状态胶囊、手势、
 *    图片/文件预览等都仍由 dsh-web-mobile 提供；
 *  · 强调色在这里统一到 App 侧选择的配色（`--dsh-accent` CSS 变量由原生注入）。
 *
 * ## 生效条件
 *
 * 只在触屏窄屏（`pointer:coarse` 且宽度 ≤1023px）生效，与上游插件同门槛——
 * 平板/桌面布局完全不受影响。
 *
 * ## 可关闭
 *
 * 侧栏形态由设置页「快捷栏样式」控制：常驻窄栏 / 上游抽屉。选择写入
 * localStorage，本文件读取后决定是否启用窄栏规则。
 */

const STYLE_ID = 'dsh-android-shell-overrides';
const PREFS_KEY = 'dsh-android-sidebar-style';

/** 'rail'（常驻窄栏，默认）| 'drawer'（上游抽屉） */
function currentStyle() {
  try {
    return localStorage.getItem(PREFS_KEY) === 'drawer' ? 'drawer' : 'rail';
  } catch (_) {
    return 'rail';
  }
}

/**
 * 常驻窄栏规则。
 *
 * 关键点（对照上游 CSS）：
 *  - 上游：`[data-mobile-nav="frame"][data-sidebar-collapsed] > :first-child
 *    { width: min(88vw,280px) !important; transform: translateX(-110%) !important }`
 *    → 这里把 width/transform 全部覆盖回常量，并把侧栏放回文档流。
 *  - 上游框架用 `style="grid-template-columns: 56px ..."` 内联样式，侧栏列本来
 *    就有 56px；侧栏一旦 absolute 就脱离该列，主区靠内联 grid 占满。恢复 rail
 *    时只需要让它不再是 absolute，grid 布局自然把 56px 列留出来。
 *  - 用 `!important` 是必须的：上游同样用 !important，且内联样式优先级低于
 *    !important 声明。
 */
const RAIL_CSS = `
@media (pointer: coarse) and (max-width: 1023px) {
  /* ── 侧栏回到文档流，成为常驻窄栏 ── */
  [data-mobile-nav="frame"] > :first-child {
    position: relative !important;
    transform: none !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    height: 100% !important;
    overflow: hidden !important;
    z-index: 1 !important;
  }

  /* 上游把折叠态宽度压到 88vw；窄栏下不折叠也保持 56px */
  [data-mobile-nav="frame"][data-sidebar-collapsed] > :first-child,
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) > :first-child {
    width: 56px !important;
    transform: none !important;
  }

  /* 窄栏内只显示图标：文字标签、分组标题隐藏（图标本身保留，点击行为不变） */
  [data-mobile-nav="frame"] > :first-child nav a span:not([data-keep]),
  [data-mobile-nav="frame"] > :first-child nav button span:not([data-keep]) {
    display: none !important;
  }
  [data-mobile-nav="frame"] > :first-child h1,
  [data-mobile-nav="frame"] > :first-child h2,
  [data-mobile-nav="frame"] > :first-child h3 {
    display: none !important;
  }

  /* 图标居中排列 */
  [data-mobile-nav="frame"] > :first-child nav a,
  [data-mobile-nav="frame"] > :first-child nav button {
    justify-content: center !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  /* 抽屉唤出按钮在窄栏模式下没有意义 → 藏掉（文件按钮保留） */
  [data-mobile-nav="toggle"] { display: none !important; }

  /* 侧栏常驻后，主区不再需要为抽屉留出遮罩层 */
  [data-mobile-nav="frame"] > :last-child[class*="overlayLayer"] {
    pointer-events: none !important;
  }

  /* 强调色统一到 App 选择的配色（原生侧注入 --dsh-accent） */
  :root { --dsh-rail-accent: var(--dsh-accent, #7DD3FC); }
}
`;

/** 上游抽屉模式：确保不残留窄栏规则 */
const DRAWER_CSS = `
@media (pointer: coarse) and (max-width: 1023px) {
  [data-mobile-nav="toggle"] { display: inline-flex !important; }
}
`;

function apply() {
  const style = currentStyle();
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    // 放在 head 末尾，晚于上游样式表 → 同等特异性下后者胜出
    (document.head || document.documentElement).appendChild(el);
  }
  const css = style === 'rail' ? RAIL_CSS : DRAWER_CSS;
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.setAttribute('data-dsh-android-sidebar', style);
}

/** 供原生侧（设置页）调用：切换后立即生效，无需刷新页面 */
function setStyle(style) {
  try {
    localStorage.setItem(PREFS_KEY, style === 'drawer' ? 'drawer' : 'rail');
  } catch (_) { /* 隐私模式下忽略 */ }
  apply();
  return currentStyle();
}

// 页面可能尚未 ready（脚本注入早于 DOM）；两者都尝试
apply();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', apply, { once: true });
}
// 上游 React 可能会重新挂载 frame；用 MutationObserver 保证规则类始终在
const obs = new MutationObserver(() => {
  if (!document.getElementById(STYLE_ID)) apply();
});
obs.observe(document.documentElement, { childList: true, subtree: false });

// 暴露给原生桥（MainActivity 通过 evaluateJavascript 调用）
window.__dshAndroidShell = {
  setStyle,
  getStyle: currentStyle,
};
