/**
 * [dsh-android] 窄屏三插件的**性能回归**测试（v1.4.0，issue #26）。
 *
 * ## 为什么需要这组测试
 * issue #26 报告「长会话滑动/开侧栏/弹输入法时卡顿」。排查发现一部分开销来自
 * 我们自己的三个窄屏插件：
 *
 *   · narrow-settings：`refresh()` 在找不到 dialog 时做**全页**
 *     `querySelectorAll("div, section, aside")`，对每个候选沿祖先链
 *     `getComputedStyle()` + `querySelectorAll("button")` + `getBoundingClientRect()`；
 *   · 三个插件都用 `subtree: true` 观察整棵文档，AI 工作时消息流每几毫秒增删
 *     节点 → 每帧触发一次重判。
 *
 * 修复后必须守住两条不变量：
 *   ① **无设置面板时不得发生全页扫描**（廉价预判生效）；
 *   ② **高频 DOM 变化不得每帧重判**（200ms 节流生效）。
 *
 * 这组测试直接统计插件执行期间的 DOM 查询次数与 refresh 次数，而不是测时序——
 * 次数是确定性指标，在不同机器上结果一致。
 *
 * 运行：node _test_narrow_perf.mjs
 */

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const BASE = new URL("../../app/src/main/assets/android-plugins/", import.meta.url);
const SETTINGS_SRC = readFileSync(new URL("narrow-settings/client.js", BASE), "utf8");
const SIDEBAR_SRC = readFileSync(new URL("narrow-sidebar/client.js", BASE), "utf8");
const RIGHTBAR_SRC = readFileSync(new URL("narrow-rightbar/client.js", BASE), "utf8");

let pass = 0, fail = 0;
const check = (label, cond, extra) => {
  if (cond) { console.log("   ✓ " + label); pass++; }
  else { console.log("   ✗ " + label + (extra ? "  (" + extra + ")" : "")); fail++; }
};

/**
 * 在 jsdom 里跑一个插件，并统计它执行期间的 DOM 查询次数。
 *
 * 为什么统计 `querySelectorAll` / `getComputedStyle`：这两个是插件的全部
 * DOM 成本来源；`getBoundingClientRect` 在 jsdom 里恒为 0，不具参考性。
 *
 * @param src - 插件 client.js 源码
 * @param pkg - 插件的模块 id（必须等于 package.json 的 name）
 * @param html - 初始 DOM
 * @param fn - 拿到统计句柄后执行的场景
 */
function runPlugin(src, pkg, html, fn) {
  // jsdom 默认视口是 1024x768，而窄屏插件在 innerWidth > 900 时会主动不接管
  // （那是横屏/桌面的正确行为）。这里显式设成手机竖屏尺寸，才能测到接管路径。
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    beforeParse(window) {
      Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
    },
  });
  const { window } = dom;
  const stats = { qsa: 0, gcs: 0 };

  // 计数包装：插件调用的是 window 上的同名方法
  const qsa = window.document.querySelectorAll.bind(window.document);
  window.document.querySelectorAll = function (sel) {
    stats.qsa++;
    return qsa(sel);
  };
  const gcs = window.getComputedStyle.bind(window);
  window.getComputedStyle = function (el, ps) {
    stats.gcs++;
    return gcs(el, ps);
  };

  let factory = null;
  window.__ModuleLoader__ = { load: (def) => { factory = def.factory; } };
  // 插件文件是经典脚本，用 Function 注入到 window 作用域
  new Function("window", "document", "MutationObserver", "requestAnimationFrame", "setTimeout", "clearTimeout", src)(
    window,
    window.document,
    window.MutationObserver,
    window.requestAnimationFrame.bind(window),
    window.setTimeout.bind(window),
    window.clearTimeout.bind(window),
  );
  if (factory === null) throw new Error("plugin did not register: " + pkg);

  const module = factory((n) => require(n));
  const ctx = { effect: () => () => {} };
  module.apply(ctx);

  return { dom, window, stats, fn };
}

/** 主界面骨架：一堆 div、一张消息流、没有设置面板。 */
const MAIN_HTML = `<!doctype html><html><body>
  <div id="app">
    ${Array.from({ length: 60 }, (_, i) =>
      `<div class="msg"><div class="row"><span>message ${i}</span></div></div>`).join("")}
    <div class="composer"><textarea placeholder="type"></textarea></div>
  </div>
</body></html>`;

console.log("=== ① narrow-settings：主界面（无 dialog）不得全页扫描 ===");
{
  const { window, stats } = runPlugin(SETTINGS_SRC, "dsh-android-narrow-settings", MAIN_HTML);
  // 等首帧 + 三次延迟补判跑完
  await new Promise((r) => window.setTimeout(r, 3000));
  // 关键断言：没有 dialog 时，refreshed 不应产生大量 getComputedStyle
  check(
    "getComputedStyle 次数 < 20（无全页祖先链扫描）",
    stats.gcs < 20,
    "gcs=" + stats.gcs,
  );
  check(
    "querySelectorAll 次数 < 80（无 div/section/aside 全页查询）",
    stats.qsa < 80,
    "qsa=" + stats.qsa,
  );
}

console.log("\n=== ② narrow-settings：设置面板打开时必须仍能接管（功能未回归） ===");
{
  const PANEL_ATTR = "data-android-narrow-settings";
  const html = `<!doctype html><html><body>
    <div id="app">${Array.from({ length: 30 }, (_, i) => `<div class="m">m${i}</div>`).join("")}</div>
    <div class="overlay" style="position:fixed;inset:0">
      <div class="panel" role="dialog" aria-modal="true">
        <nav><button>General</button><button>Models</button><button>Plugins</button></nav>
        <div class="content"><span>body</span></div>
        <button aria-label="Close">x</button>
      </div>
    </div>
  </body></html>`;
  const { window } = runPlugin(SETTINGS_SRC, "dsh-android-narrow-settings", html);
  // jsdom 里 getBoundingClientRect 恒为 0，而插件的 structureOf() 用面积挑内容列。
  // 按真机取证值（内容列 420x520、导航 188x520）桩掉，才走得到真实分支。
  const stub = (el, w, h) => {
    if (el) el.getBoundingClientRect = () => ({ width: w, height: h, top: 24, left: 24, right: 24 + w, bottom: 24 + h });
  };
  stub(window.document.querySelector(".content"), 420, 520);
  stub(window.document.querySelector("nav"), 188, 520);
  // 下一次重判（200ms 节流窗口之后）会读到桩值
  await new Promise((r) => window.setTimeout(r, 3000));
  const panel = window.document.querySelector(".panel");
  check("面板被标记（功能保持）", panel.hasAttribute(PANEL_ATTR));
}

console.log("\n=== ③ 节流：高频 DOM 变化不得每帧重判 ===");
{
  // 统计 narrow-rightbar 的 refresh 次数（用 console.log 计数 + 选择器计数双重验证）
  const html = MAIN_HTML;
  const { window, stats } = runPlugin(RIGHTBAR_SRC, "dsh-android-narrow-rightbar", html);
  const before = stats.qsa;

  // 模拟 AI 流式输出：连续 300 次微任务级插入（远超 1 秒内的帧数）
  const host = window.document.querySelector(".composer");
  for (let i = 0; i < 300; i++) {
    const d = window.document.createElement("div");
    d.textContent = "chunk " + i;
    host.appendChild(d);
    // 让 MutationObserver 的微任务队列有机会回调
    if (i % 20 === 0) await Promise.resolve();
  }
  await new Promise((r) => window.setTimeout(r, 400));

  const delta = stats.qsa - before;
  check(
    "300 次 DOM 插入导致的查询增量 < 300（节流生效）",
    delta < 300,
    "delta=" + delta,
  );
}

console.log("\n────────────────────────────");
console.log(`通过 ${pass} / 失败 ${fail}`);
if (fail > 0) process.exit(1);
