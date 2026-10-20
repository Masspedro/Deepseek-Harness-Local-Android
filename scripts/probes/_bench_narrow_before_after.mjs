/**
 * 量化修复前后的 DOM 查询开销差异（issue #26）。
 *
 * 同一份「主界面 + 60 条消息」DOM，模拟 AI 流式输出 200 次节点插入，
 * 统计插件产生的 querySelectorAll / getComputedStyle 次数：
 *   · BEFORE = 修复前的行为（subtree 全属性观察 + 无预判）
 *   · AFTER  = 当前插件（节流 + 廉价预判）
 *
 * 用法：node _bench_narrow_before_after.mjs
 */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const BASE = new URL("../../app/src/main/assets/android-plugins/", import.meta.url);
const SRC = readFileSync(new URL("narrow-settings/client.js", BASE), "utf8");

const HTML = `<!doctype html><html><body>
  <div id="app">
    ${Array.from({ length: 60 }, (_, i) =>
      `<div class="msg"><div class="row"><span>m${i}</span></div></div>`).join("")}
    <div class="composer"><textarea></textarea></div>
  </div>
</body></html>`;

/**
 * @param patchBefore - true 时把插件改成「修复前」行为：节流阈值置 0 + 跳过预判
 */
async function measure(patchBefore) {
  const dom = new JSDOM(HTML, {
    pretendToBeVisual: true,
    beforeParse(window) {
      Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
    },
  });
  const { window } = dom;
  const stats = { qsa: 0, gcs: 0 };
  const qsa = window.document.querySelectorAll.bind(window.document);
  window.document.querySelectorAll = (s) => { stats.qsa++; return qsa(s); };
  const gcs = window.getComputedStyle.bind(window);
  window.getComputedStyle = (e, p) => { stats.gcs++; return gcs(e, p); };

  let src = SRC;
  if (patchBefore) {
    // 还原修复前的两个特征：无预判 + 无节流
    src = src.replace(
      "if (!maybePanelPresent()) {",
      "if (false) {",
    ).replace("var MIN_INTERVAL_MS = 200;", "var MIN_INTERVAL_MS = 0;");
  }

  let factory = null;
  window.__ModuleLoader__ = { load: (d) => { factory = d.factory; } };
  new Function("window","document","MutationObserver","requestAnimationFrame","setTimeout","clearTimeout", src)(
    window, window.document, window.MutationObserver,
    window.requestAnimationFrame.bind(window),
    window.setTimeout.bind(window), window.clearTimeout.bind(window));
  factory((n) => require(n)).apply({ effect: () => () => {} });

  await new Promise((r) => window.setTimeout(r, 300));
  const base = { ...stats };

  // 模拟 AI 流式输出：200 次插入，间隔 5ms（≈ 每秒 200 次 DOM 变动）
  const host = window.document.querySelector(".composer");
  for (let i = 0; i < 200; i++) {
    const d = window.document.createElement("div");
    d.textContent = "chunk " + i;
    host.appendChild(d);
    await new Promise((r) => window.setTimeout(r, 5));
  }
  await new Promise((r) => window.setTimeout(r, 500));

  return {
    qsa: stats.qsa - base.qsa,
    gcs: stats.gcs - base.gcs,
  };
}

const before = await measure(true);
const after = await measure(false);

console.log("主界面 + 200 次 DOM 插入（模拟 AI 流式输出）：\n");
console.log("  修复前  querySelectorAll=" + before.qsa + "  getComputedStyle=" + before.gcs);
console.log("  修复后  querySelectorAll=" + after.qsa + "  getComputedStyle=" + after.gcs);
const pct = (a, b) => (b === 0 ? "n/a" : Math.round((1 - a / b) * 100) + "%");
console.log("\n  降幅    qsa=" + pct(after.qsa, before.qsa) + "  gcs=" + pct(after.gcs, before.gcs));
