/**
 * [dsh-android] 长会话渲染减负（v1.4.5，issue #26 第二层）。
 *
 * ## 背景
 * v1.4.4 修掉了「我们自己的三个窄屏插件每帧重判」——那是六万八千次
 * `getComputedStyle` 的来源，已经解决。但 issue #26 的现场还剩另一半：
 *
 *   · 会话跑到 300~400 轮后，滑动、开侧边栏、呼出输入法都卡；
 *   · 新开会话立刻流畅；
 *   · 服务端打开会话只要 11ms（实测），所以**不是数据加载问题**。
 *
 * 剩下的部分在引擎自己的渲染上：正文 `ChatFlow` 用 `entries.map(...)`
 * **全量渲染**，右侧轮次导航条才有虚拟滚动。300 轮 × 每轮数个工具调用
 * = 上千个常驻 DOM 节点，手机上每次重排都要为它们付代价。
 *
 * ## 为什么用 CSS 而不是改 React
 * 引擎的渲染逻辑属于上游，改它会被升级覆盖，而且和 React 内部状态耦合很深。
 * 我们需要的只是**让视口外的行不要参与排版**——这正好是 CSS 的
 * `content-visibility: auto` 的语义：
 *
 *   · 元素进入视口前，浏览器跳过它的**布局与绘制**；
 *   · 配合 `contain-intrinsic-size` 给出占位高度估算，滚动条长度仍然正确；
 *   · 元素滚动到视口内时自动恢复正常渲染，**用户感知不到差别**；
 *   · 完全不碰 React、不碰 DOM 结构、不碰任何数据。
 *
 * 这是 Chrome 85+ 的特性。本应用要求 WebView ≥ Chrome 85（启动时会拦截更低版本），
 * 所以覆盖得到。
 *
 * ## 安全边界
 * · 只加一条样式表，作用域限定在聊天流容器（`[data-slot="conversation.chat.flow"]`）
 *   的直接子行，且带 `data-chat-turn`（引擎给每个轮次行打的语义属性）；
 * · **不动** `.flowItem` 以外任何元素，不动导航条、输入框、侧栏；
 * · 卸载时移除样式表，零残留；
 * · 不支持 `content-visibility` 的 WebView 会自动忽略这条规则（CSS 未知属性
 *   直接丢弃），等于完全不生效 —— 不会更糟。
 *
 * ## 为什么不需要开关
 * 这是纯渲染优化：视觉结果相同、数据完全相同、滚动位置正常。没有需要用户
 * 权衡的取舍，因此不设开关（少一个用户需要理解的设置项）。
 *
 * @module dsh-android-chat-perf
 */

window.__ModuleLoader__.load({
  id: "dsh-android-chat-perf",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    /** 样式表 id（幂等：重复激活只保留一份）。 */
    var STYLE_ID = "dsh-android-chat-perf-style";

    /**
     * 占位高度估算（px）。
     *
     * `content-visibility: auto` 需要知道「还没渲染的这一行大概多高」，
     * 否则滚动条会在滚动过程中不断变化（浏览器先按 0 算，逐行渲染后又变长）。
     *
     * 取 160px：普通对话轮次（一段回复 + 一两个工具卡片）大致在这个量级。
     * 估算偏差只影响**滚动条的瞬时位置**，不影响最终布局 —— 行真正渲染时
     * 会立刻按实际高度重排。
     */
    var ESTIMATED_ROW_HEIGHT_PX = 160;

    /**
     * 注入的样式。
     *
     * 选择器解析：
     *   · `.EvIC1a_flowItem` 是哈希类名，会随引擎构建变化 → 不能写死；
     *   · 改用**语义属性**：引擎给每个轮次行打了 `data-chat-turn`，
     *     给整个聊天流容器打了 `data-slot="conversation.chat.flow"`；
     *   · 只选流容器的**直接子元素**（每一行），不深入行内部 ——
     *     行内部的元素保持正常渲染，避免影响工具卡片的懒加载行为。
     */
    function styleText() {
      var flow = '[data-slot="conversation.chat.flow"]';
      return [
        "/* 视口外的聊天行跳过布局与绘制（内容不变，滚到视口内自动渲染） */",
        flow + " > [data-chat-turn] {",
        "  content-visibility: auto;",
        // ⚠️ v1.4.6（审查发现）：`contain-intrinsic-size: auto <length>` 的
        // remembered-size 语法要 Chrome 98+，而本应用最低支持 Chrome 85。
        // 在 85–97 上该声明整体失效 → 被跳过的行按高度 0 计算 → 滚动条在滚动
        // 过程中剧烈伸缩、滚动位置跳动，比不加优化更糟。
        //
        // 先写单值形式（Chrome 85 起可用）作为基础兜底，再写 auto 形式让新版
        // 浏览器额外获得 remembered size 校准。不支持的版本丢弃第二条、保留
        // 第一条 —— 两级降级，任何 WebView 都不会退化成「高度 0」。
        "  contain-intrinsic-size: " + ESTIMATED_ROW_HEIGHT_PX + "px;",
        "  contain-intrinsic-size: auto " + ESTIMATED_ROW_HEIGHT_PX + "px;",
        "}",
      ].join("\n");
    }

    /** 插入样式表（幂等）。 */
    function insertStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = styleText();
      (document.head || document.documentElement).appendChild(style);
    }

    /** 移除样式表（幂等）。 */
    function removeStyle() {
      var old = document.getElementById(STYLE_ID);
      var p = old && (old.parentElement || old.parentNode);
      if (p) p.removeChild(old);
    }

    /**
     * 浏览器端插件体。
     * @param {object} ctx - 客户端 Cordis 上下文。
     * @returns {() => void} 卸载函数。
     */
    function apply(ctx) {
      /**
       * 只在**会话界面存在**时注入。
       *
       * 主界面、设置页、插件市场都没有聊天流容器 —— 那时注入是无效样式，
       * 虽然无害但没必要。用 MutationObserver 等它出现。
       *
       * ⚠️ 观察器只监听 childList（不监听属性），且回调里只做一次
       * querySelector —— 这是 v1.4.4 issue #26 的教训：**绝不能**在 DOM
       * 变化时做全量扫描。这里即使每帧触发，成本也只是一次属性选择器查询。
       */
      function ensure() {
        if (document.querySelector('[data-slot="conversation.chat.flow"]')) {
          insertStyle();
          return true;
        }
        return false;
      }

      if (ensure()) {
        // 已就绪（插件在会话页加载）
      } else {
        var mo = new MutationObserver(function () {
          if (ensure()) mo.disconnect();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        // 兜底：万一切换会话时观察器漏了，再做几次延迟检查
        var timers = [500, 1500, 4000].map(function (ms) {
          return window.setTimeout(ensure, ms);
        });
        ctx.effect(function () {
          return function () {
            mo.disconnect();
            timers.forEach(function (t) { window.clearTimeout(t); });
          };
        });
      }

      return function () {
        removeStyle();
      };
    }

    exports.apply = apply;
    return module.exports;
  },
});
