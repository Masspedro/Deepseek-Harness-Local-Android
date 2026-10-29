/**
 * [dsh-android] `fast_mode` 工具插件（v1.2.166，用户要求「直接做成内置插件」）。
 *
 * ## 为什么从 shell 闸门改成工具插件
 * 最初做成 `fast` 闸门脚本（AI 敲 shell 命令）。用户实测：AI **不会主动用** ——
 * 因为它是 shell 命令、藏在 seed 说明里，模型要先"想起"再敲命令；
 * 而**注册成工具**后它会出现在模型的工具列表里，伴随任务型对话自然被选中。
 *
 * ## 它做什么
 * 标记 UI 自动化工作流，不修改模型、provider 或 reasoningEffort。
 * 把多步计划交给本地 `loop` 执行，避免每次手势都重新请求云端决策。
 * 这不等于关闭模型思考，也不承诺每次请求变快。
 *
 * 工具：`fast_mode(action: "on" | "off" | "status")`
 * 状态存在 `$DSH_HOME/fast-mode` 标记文件 → 跨进程共享、无需重启，
 * 且与遗留的 `fast` 闸门兼容（同一份标记）。
 *
 * ## 为什么不再改 agent/request
 * 当前运行时会把该 waterfall 的最终配置写入持久 request/header。
 * 临时 off 因此可能覆盖用户选择并被后续会话、goal 和子任务继承。
 * 没有独立于持久配置的临时请求接口前，不在这里切换 reasoningEffort。
 * 旧版本已写入的 off 不会被关开关或 TTL 自动恢复；须显式重选有效档位。
 *
 * ## 安全阀
 * 标记带 **30 分钟 TTL**：读取过期标记时清理；只影响工作流标记。
 *
 * @module dsh-android-fast-mode
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const name = "android-fast-mode";

/** 仅需要 tools 服务；不注册模型请求钩子。 */
const inject = ["tools"];

/**
 * 动态加载 `@deepseek-ai/dsh-tools`（v1.2.168 实测修复）。
 *
 * ⚠️ 不能写静态 `import { defineTool } from "@deepseek-ai/dsh-tools"`：
 * 本插件位于 `engine/android-plugins/`，**不在 node 的模块解析链上**
 * （engine/ 下没有 node_modules），裸包名解析必然失败 →
 * 引擎日志 `android-fast-mode: failed to import` → **工具从未注册**
 * （实测：AI 因此完全没有 fast_mode 可用）。
 *
 * 实测结论：裸包名不可用（NODE_PATH 对 ESM 无效），但**绝对路径可用**
 * （`…/engine/lib/node_modules/@deepseek-ai/dsh-tools/lib/index.js` 导入成功）。
 * 这里从插件自身位置推算 engine 根，再按绝对路径动态 import。
 */
async function loadDefineTool() {
  // 本文件在 <engine>/android-plugins/fast-mode.mjs → engine 根是上一级
  const here = path.dirname(new URL(import.meta.url).pathname);
  const engineRoot = path.resolve(here, "..");
  const candidates = [
    path.join(engineRoot, "lib/node_modules/@deepseek-ai/dsh-tools/lib/index.js"),
    path.join(engineRoot, "node_modules/@deepseek-ai/dsh-tools/lib/index.js"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const m = await import(pathToFileURL(c).href);
        if (typeof m.defineTool === "function") return m.defineTool;
      }
    } catch { /* try next */ }
  }
  return void 0;
}

/** 标记文件（与 gates/fast 约定一致）。 */
const MARKER_NAME = "fast-mode";

/** 开关自动失效时长：防「开了忘了关」（用户反馈的真实风险）。 */
const TTL_MS = 30 * 60 * 1000;

const REASONING_NOTE =
  "Selected model, provider and reasoning effort are unchanged. This runtime cannot " +
  "safely change per-step reasoning without persisting it. OFF or expiry does not " +
  "restore reasoning effort saved by older versions; after turning the marker OFF, " +
  "explicitly reselect a valid reasoning effort if needed.";

const DESCRIPTION = [
  "Toggle the FAST MODE workflow hint for accessibility / UI automation on this Android device.",
  "",
  "ON marks a UI task; it does not disable model reasoning or change model/provider selection.",
  "For multi-step UI work, submit a plan to the local loop executor: it executes the",
  "planned matching, actions and verification without a cloud decision per gesture.",
  "This marker alone does not accelerate model requests.",
  "",
  "Turn it ON before a UI task and OFF when finished. Use status to check the marker.",
  "The marker expires after 30 minutes; expired markers are cleaned up when read.",
  "",
  REASONING_NOTE,
].join("\n");

/** 工具结果的人类可读渲染（模型与 UI 都会读它） */
function renderFastMode(v) {
  if (!v || typeof v !== "object") return String(v);
  if (v.ok !== true) return "fast_mode failed: " + (v.error || "unknown error");
  if (v.fast === true) {
    return "Fast mode is ON" +
      (v.elapsedMinutes ? " (on for " + v.elapsedMinutes + " min)" : "") +
      (v.autoExpiresInMinutes ? ", auto-expires in " + v.autoExpiresInMinutes + " min" : "") +
      " (UI workflow hint). Turn it off when the UI task is done. " + REASONING_NOTE;
  }
  return "Fast mode is OFF (UI workflow hint). " + REASONING_NOTE;
}

/** 读标记：返回 {on, ageMs} —— 超过 TTL 视为已失效并顺手清理。 */
function readMarker(marker) {
  if (!marker) return { on: false, ageMs: 0 };
  try {
    const st = fs.statSync(marker);
    const ageMs = Date.now() - st.mtimeMs;
    if (ageMs > TTL_MS) {
      try { fs.unlinkSync(marker); } catch {}
      return { on: false, ageMs };
    }
    return { on: true, ageMs };
  } catch {
    return { on: false, ageMs: 0 };
  }
}

/**
 * 挂载：仅注册 `fast_mode` 工作流标记工具。
 * @param ctx - 插件上下文（需 tools 服务）。
 */
async function apply(ctx) {
  const home = process.env.DSH_HOME || "";
  const marker = home ? path.join(home, MARKER_NAME) : "";

  // Do not register agent/request: its result becomes durable request/header
  // state. A capability guard cannot make a temporary override reversible.

  // ---- 工具：让模型自己标记 UI 工作流（保留工具/遗留闸门兼容）----
  // defineTool 动态加载（见 loadDefineTool 说明）；失败时不注册任何能力，
  // 并明确记一条日志，避免"工具没注册却无人知晓"（实测踩坑）。
  const defineTool = await loadDefineTool();
  if (defineTool === void 0) {
    console.warn("[android-fast-mode] defineTool unavailable — tool NOT registered (no request override)");
    return;
  }
  ctx.tools.register(defineTool({
    name: "fast_mode",
    description: DESCRIPTION,
    parameters: {
      action: {
        type: "string",
        required: true,
        enum: ["on", "off", "status"],
        description:
          "on = mark a UI workflow without changing model reasoning; " +
          "off = clear the workflow marker (does not restore saved reasoning effort); " +
          "status = report marker state and clean up an expired marker.",
      },
    },
    // ⚠️ `output` 是 defineTool 的**必填**字段（v1.2.169 实测踩坑）：
    // 缺它会在 defineTool 内部直接抛
    //   TypeError: Cannot read properties of undefined (reading 'render')
    // （源码：`const userRender = options.output.render`）→ 插件加载失败 → 工具没注册。
    // 形状照抄引擎自带的 tool-goal：{ schema, render }。
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          ok: { type: "boolean", required: true },
          fast: { type: "boolean" },
          note: { type: "string" },
          elapsedMinutes: { type: "number" },
          autoExpiresInMinutes: { type: "number" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => [{ type: "text", text: renderFastMode(value) }],
    },
    execute(args) {
      const action = String((args && args.action) || "").toLowerCase();
      if (action === "on") {
        if (!marker) {
          return Promise.resolve({ ok: false, error: "DSH_HOME is not set; cannot store fast mode" });
        }
        try {
          fs.writeFileSync(marker, String(Date.now()));
        } catch (e) {
          return Promise.resolve({ ok: false, error: "cannot write " + marker + ": " + (e && e.message) });
        }
        return Promise.resolve({
          ok: true, fast: true,
          note: "fast mode ON — UI workflow hint; turn it off when done. " + REASONING_NOTE,
        });
      }
      if (action === "off") {
        try { fs.unlinkSync(marker); } catch {}
        return Promise.resolve({ ok: true, fast: false, note: "fast mode OFF — UI workflow hint cleared. " + REASONING_NOTE });
      }
      if (action === "status") {
        const st = readMarker(marker);
        return Promise.resolve({
          ok: true,
          fast: st.on,
          note: REASONING_NOTE,
          elapsedMinutes: st.on ? Math.round(st.ageMs / 60000) : 0,
          autoExpiresInMinutes: st.on ? Math.max(0, Math.round((TTL_MS - st.ageMs) / 60000)) : 0,
        });
      }
      return Promise.resolve({ ok: false, error: "unknown action \"" + (args && args.action) + "\" (use on|off|status)" });
    },
  }));
}

export { apply, inject, name };
