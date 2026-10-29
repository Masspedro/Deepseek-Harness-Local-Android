import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test, after } from "node:test";
import {
  FixtureContext, installLegacyFastMode, installSelectionFixture, persistRequestFixture,
} from "./fixtures/fast-mode-request.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const asset = path.join(root, "app/src/main/assets/android-plugins/fast-mode.mjs");
const gate = path.join(root, "app/src/main/assets/gates/fast");
const TTL_MS = 30 * 60 * 1000;
// All writes, imports of fake modules, marker operations and cleanup stay here.
const temporary = fs.mkdtempSync(path.join(root, ".fast-mode-test-"));
const fixtureEngine = path.join(temporary, "engine");
const pluginFile = path.join(fixtureEngine, "android-plugins/fast-mode.mjs");
const toolsDir = path.join(fixtureEngine, "lib/node_modules/@deepseek-ai/dsh-tools");
fs.mkdirSync(path.dirname(pluginFile), { recursive: true });
fs.mkdirSync(path.join(toolsDir, "lib"), { recursive: true });
fs.copyFileSync(asset, pluginFile);
// Test-only dependency at the real plugin's existing absolute resolution path.
// The production asset is copied verbatim, with no injected parameters/hooks.
fs.writeFileSync(path.join(toolsDir, "package.json"), '{"type":"module"}');
fs.writeFileSync(path.join(toolsDir, "lib/index.js"), "export const defineTool = options => options;\n");
const plugin = await import(pathToFileURL(pluginFile).href);

let Context = FixtureContext;
const cordisModule = process.env.DSH_TEST_CORDIS_MODULE;
if (cordisModule) {
  // Explicit public local module only; no bare SDK/app imports or discovery.
  assert.ok(path.isAbsolute(cordisModule), "DSH_TEST_CORDIS_MODULE must be an absolute local path");
  ({ Context } = await import(pathToFileURL(cordisModule).href));
  assert.equal(typeof Context, "function");
}
const contexts = [];
after(async () => {
  for (const ctx of contexts) if (ctx.fiber) await ctx.fiber.dispose();
  // Verify the resolved absolute target before any recursive deletion.
  const resolved = fs.realpathSync(temporary);
  assert.equal(path.dirname(resolved), fs.realpathSync(root));
  assert.ok(path.basename(resolved).startsWith(".fast-mode-test-"));
  fs.rmSync(resolved, { recursive: true, force: true });
});

function context() {
  const ctx = new Context();
  contexts.push(ctx);
  return ctx;
}
let fixtureId = 0;
async function mounted({ noHome = false, missingLoader = false } = {}) {
  const ctx = context();
  const registered = [];
  const listeners = [];
  const tools = { register: tool => registered.push(tool) };
  if (ctx.provide) ctx.provide("tools", tools);
  else ctx.tools = tools;
  const realOn = ctx.on.bind(ctx);
  ctx.on = (event, ...args) => {
    listeners.push(event);
    return realOn(event, ...args);
  };
  const home = path.join(temporary, `home-${++fixtureId}`);
  fs.mkdirSync(home);
  const previousHome = process.env.DSH_HOME;
  process.env.DSH_HOME = noHome ? "" : home;
  let target = plugin;
  if (missingLoader) {
    const isolatedFile = path.join(temporary, `no-loader-${fixtureId}/android-plugins/fast-mode.mjs`);
    fs.mkdirSync(path.dirname(isolatedFile), { recursive: true });
    fs.copyFileSync(asset, isolatedFile);
    target = await import(pathToFileURL(isolatedFile).href);
  }
  try { await target.apply(ctx); }
  finally {
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
  }
  return { ctx, tool: registered[0], registered, listeners, home, marker: path.join(home, "fast-mode") };
}
function render(tool, result) {
  return tool.output.render({}, result).map(part => part.text).join("\n");
}
function assertHonest(text) {
  assert.match(text, /unchanged/);
  assert.match(text, /does not.*restore/is);
  assert.match(text, /explicitly reselect a valid reasoning effort/);
  assert.doesNotMatch(text, /thinking on|thinking disabled|reasoning is skipped|skip per-step reasoning|times faster|hook still active/i);
}
function gateCall(home, action) {
  // Scrub provider/session/config environment; retain only toolchain essentials
  // for bionic Node/bash and an OWN fixture home, never the device's real marker.
  const resolvedHome = fs.realpathSync(home);
  assert.equal(path.dirname(resolvedHome), fs.realpathSync(temporary));
  assert.match(path.basename(resolvedHome), /^home-\d+$/);
  const env = { DSH_HOME: resolvedHome };
  for (const key of ["PATH", "LD_LIBRARY_PATH", "OPENSSL_CONF"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  const result = spawnSync("bash", [gate, action], { env, encoding: "utf8", cwd: temporary });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("explicit public Cordis Context integration", { skip: !cordisModule }, () => {
  assert.notEqual(Context, FixtureContext);
});

test("legacy outer hook overwrites scoped high and leaves durable off after disable", async () => {
  const ctx = context();
  let fast = true;
  installLegacyFastMode(ctx, () => fast);
  const selection = installSelectionFixture(ctx, { provider: "fixture-provider", model: "fixture-model", reasoningEffort: "high" });
  const initial = await persistRequestFixture(ctx, { provider: "fixture-provider", model: "fixture-model" });
  assert.equal(initial.config.reasoningEffort, "off");
  selection();
  fast = false;
  const resumed = await persistRequestFixture(ctx, initial.config);
  const goal = await persistRequestFixture(ctx, resumed.config);
  const child = await persistRequestFixture(context(), goal.config);
  for (const header of [resumed, goal, child]) assert.equal(header.config.reasoningEffort, "off");
});

test("patched plugin registers only the tool, never any request listener", async () => {
  const { tool, registered, listeners } = await mounted();
  assert.equal(registered.length, 1);
  assert.equal(tool.name, "fast_mode");
  assert.deepEqual(plugin.inject, ["tools"]);
  assert.deepEqual(listeners, []);
});

for (const effort of ["high", "opaque-future-effort", "off", undefined]) {
  test(`preserve selection/route/custom fields with marker ON: ${String(effort)}`, async () => {
    const { ctx, tool } = await mounted();
    await tool.execute({ action: "on" });
    const selected = { provider: "opaque-provider", model: "opaque-model", reasoningEffort: effort };
    const disposeSelection = installSelectionFixture(ctx, selected);
    const seed = { provider: "old-provider", model: "old-model", reasoningEffort: "inherited", custom: { untouched: [1, 2] }, maxTokens: 123 };
    const expected = { ...seed, provider: selected.provider, model: selected.model };
    delete expected.reasoningEffort;
    if (effort !== undefined) expected.reasoningEffort = effort;
    const header = await persistRequestFixture(ctx, seed);
    assert.deepEqual(header.config, expected);
    disposeSelection();
    const resumed = await persistRequestFixture(ctx, header.config);
    const goal = await persistRequestFixture(ctx, resumed.config);
    const child = await persistRequestFixture(context(), goal.config);
    for (const continuation of [resumed, goal, child]) assert.deepEqual(continuation.config, expected);
    await tool.execute({ action: "off" });
    assert.deepEqual((await persistRequestFixture(ctx, child.config)).config, expected);
  });
}

test("request values preserve identity in every marker/time window, including undefined", async () => {
  const { ctx, tool, marker } = await mounted();
  const proposal = Object.freeze({ provider: "fixture", model: "fixture", reasoningEffort: "high", custom: Object.freeze({ retain: true }) });
  const check = async () => {
    assert.equal(await ctx.waterfall("agent/request", {}, () => Promise.resolve(proposal)), proposal);
    assert.equal(await ctx.waterfall("agent/request", {}, () => Promise.resolve(undefined)), undefined);
  };
  await check();
  await tool.execute({ action: "on" });
  await check(); // No old 1.5s stale cache window.
  const now = Date.now();
  fs.utimesSync(marker, new Date(now), new Date(now - TTL_MS + 2000));
  assert.equal((await tool.execute({ action: "status" })).fast, true);
  await check();
  fs.utimesSync(marker, new Date(now), new Date(now - TTL_MS - 2000));
  await check(); // Requests neither read nor clean the marker.
  assert.equal(fs.existsSync(marker), true);
  assert.equal((await tool.execute({ action: "status" })).fast, false);
  assert.equal(fs.existsSync(marker), false);
  await check();
  await tool.execute({ action: "on" });
  await tool.execute({ action: "off" });
  await check();
});

test("on/off/status remain idempotent, TTL refreshes, and descriptions/results are honest", async () => {
  const { tool, marker } = await mounted();
  assertHonest(tool.description);
  assert.match(tool.description, /local loop executor/);
  assert.match(tool.description, /cannot safely change per-step reasoning without persisting it/);
  assert.match(tool.parameters.action.description, /without changing model reasoning/);
  assert.match(tool.parameters.action.description, /does not restore saved reasoning effort/);
  for (const action of ["status", "on", "on", "status", "off", "off", "status"]) {
    const result = await tool.execute({ action });
    assert.equal(result.ok, true);
    assertHonest(result.note);
    assertHonest(render(tool, result));
    if (action === "on") assert.equal(fs.existsSync(marker), true);
    if (action === "off") assert.equal(fs.existsSync(marker), false);
  }
  await tool.execute({ action: "on" });
  const old = new Date(Date.now() - 20 * 60 * 1000);
  fs.utimesSync(marker, old, old);
  assert.equal((await tool.execute({ action: "status" })).elapsedMinutes, 20);
  await tool.execute({ action: "on" });
  const refreshed = await tool.execute({ action: "status" });
  assert.equal(refreshed.elapsedMinutes, 0);
  assert.equal(refreshed.autoExpiresInMinutes, 30);
});

test("legacy saved off is not silently repaired; explicit selection restores valid high", async () => {
  const { ctx, tool } = await mounted();
  const legacyHeader = { provider: "fixture", model: "fixture", reasoningEffort: "off" };
  assert.equal((await persistRequestFixture(ctx, legacyHeader)).config.reasoningEffort, "off");
  assertHonest((await tool.execute({ action: "off" })).note);
  assert.equal((await persistRequestFixture(ctx, legacyHeader)).config.reasoningEffort, "off");
  installSelectionFixture(ctx, { provider: "fixture", model: "fixture", reasoningEffort: "high" });
  assert.equal((await persistRequestFixture(ctx, legacyHeader)).config.reasoningEffort, "high");
});

test("legacy gate and tool share only the OWN fixture marker", async () => {
  const { tool, home, marker } = await mounted();
  assertHonest(gateCall(home, "on").note);
  assert.equal((await tool.execute({ action: "status" })).fast, true);
  await tool.execute({ action: "off" });
  assert.equal(gateCall(home, "status").fast, false);
  await tool.execute({ action: "on" });
  assert.equal(gateCall(home, "status").fast, true);
  assertHonest(gateCall(home, "off").note);
  assert.equal((await tool.execute({ action: "status" })).fast, false);
  gateCall(home, "on");
  const expired = new Date(Date.now() - TTL_MS - 2000);
  fs.utimesSync(marker, expired, expired);
  // CLI has always queried existence only; the tool enforces TTL on read.
  assert.equal(gateCall(home, "status").fast, true);
  assert.equal((await tool.execute({ action: "status" })).fast, false);
  assert.equal(fs.existsSync(marker), false);
});

test("missing home and invalid actions fail without touching the real marker", async () => {
  const { tool, listeners } = await mounted({ noHome: true });
  assert.deepEqual(listeners, []);
  assert.equal((await tool.execute({ action: "on" })).ok, false);
  assert.equal((await tool.execute({ action: "status" })).fast, false);
  assert.equal((await tool.execute({ action: "off" })).fast, false);
  for (const args of [{ action: "invalid" }, {}, undefined]) {
    const result = await tool.execute(args);
    assert.equal(result.ok, false);
    assert.match(render(tool, result), /fast_mode failed/);
  }
});

test("unavailable defineTool leaves no hidden request override", async () => {
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = message => warnings.push(message);
  let result;
  try { result = await mounted({ missingLoader: true }); }
  finally { console.warn = previousWarn; }
  assert.deepEqual(result.registered, []);
  assert.deepEqual(result.listeners, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no request override/);
  assert.doesNotMatch(warnings[0], /hook still active/);
});
