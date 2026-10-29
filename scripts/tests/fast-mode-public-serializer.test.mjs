import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";

// Optional public-source checks: extract ONLY two pure functions into a VM.
// No SDK initialization/imports, SDK state, provider clients, credentials or I/O
// are available to them. Helpers unrelated to reasoning are mocked explicitly.
// This is not an end-to-end route test or proof of a deployed provider protocol.
const adapter = process.env.DSH_TEST_PI_ADAPTER_SOURCE;
const responses = process.env.DSH_TEST_PI_RESPONSES_SOURCE;

test("public adapter off omission and isolated Responses payload defaults", {
  skip: !adapter || !responses,
}, () => {
  assert.ok(path.isAbsolute(adapter));
  assert.ok(path.isAbsolute(responses));
  const adapterSource = fs.readFileSync(adapter, "utf8");
  const profileMatch = adapterSource.match(/^function profileOptions\(profile, reasoning, apiKey\) \{[\s\S]*?^\}/m);
  assert.ok(profileMatch, "public adapter profileOptions signature changed; re-review the test");
  const profileOptions = vm.runInNewContext(`${profileMatch[0]}; profileOptions`, Object.create(null), { timeout: 1000 });
  const disabled = profileOptions({}, "off", undefined);
  assert.equal(Object.hasOwn(disabled, "reasoning"), false);
  assert.equal(profileOptions({}, "high", undefined).reasoning, "high");

  const source = fs.readFileSync(responses, "utf8");
  const paramsMatch = source.match(/^function buildParams\(model, context, options, compat, grammarToolInputProperties, configurationUpdateEffort\) \{[\s\S]*?^\}/m);
  assert.ok(paramsMatch, "public Responses buildParams signature changed; re-review the test");
  const helpers = {
    resolveTranscriptTools: () => ({ requestTools: [] }),
    getResponsesToolSupport: () => ({}),
    convertResponsesMessages: () => [],
    OPENAI_TOOL_CALL_PROVIDERS: [],
    resolveCacheRetention: () => "none",
    isChatGPTSignIn: () => false,
    clampOpenAIPromptCacheKey: () => undefined,
    getPromptCacheRetention: () => undefined,
    getPromptCacheOptions: () => undefined,
    resolveSamplingParams: () => undefined,
  };
  const buildParams = vm.runInNewContext(`${paramsMatch[0]}; buildParams`, helpers, { timeout: 1000 });
  const model = { id: "fixture-reasoning-model", provider: "fixture-provider", reasoning: true };
  const context = { messages: [] };
  const payload = buildParams(model, context, {}, {}, undefined, undefined);
  assert.equal(payload.reasoning.effort, "none");
  const high = buildParams(model, context, { reasoningEffort: "high" }, {}, undefined, undefined);
  assert.equal(high.reasoning.effort, "high");
  const unsupportedOff = buildParams({ ...model, thinkingLevelMap: { off: null } }, context, {}, {}, undefined, undefined);
  assert.equal(Object.hasOwn(unsupportedOff, "reasoning"), false);
});
