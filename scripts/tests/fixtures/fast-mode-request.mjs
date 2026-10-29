// Source-based, offline fixtures; these are NOT the full SDK runtime.
// The legacy hook is reproduced from this repository's fast-mode.mjs at
// 06ffe51760dce7484572a2bd151b01267d3786cf:145-150 (MIT; see root LICENSE).
// The other functions model the public SDK's request/header contract:
// @deepseek-ai/dsh-agent/lib/index.js:181-191 and
// @deepseek-ai/dsh-agent-loop/lib/index.js:1174-1235 (0.2.1-rc.2).

export function installLegacyFastMode(ctx, isFast) {
  ctx.on("agent/request", async (_payload, next) => {
    const proposed = await next();
    if (proposed === undefined) return proposed;
    if (!isFast()) return proposed;
    return { ...proposed, reasoningEffort: "off" };
  });
}

export function installSelectionFixture(ctx, selected) {
  return ctx.on("agent/request", async (_payload, next) => {
    const resolved = await next();
    const result = { ...resolved, provider: selected.provider, model: selected.model };
    delete result.reasoningEffort;
    if (selected.reasoningEffort !== undefined) result.reasoningEffort = selected.reasoningEffort;
    return result;
  });
}

// A header snapshot represents the final effective request, not intent or origin.
// Resumed requests and child/goal continuations reuse it in this fixture. No real
// session file, goal service, compaction implementation or provider is invoked.
export async function persistRequestFixture(ctx, seed) {
  const config = await ctx.waterfall("agent/request", {}, () => Promise.resolve(seed));
  return { config: structuredClone(config) };
}

// For dependency-free tests only: first registered callback wraps later ones.
// The explicit DSH_TEST_CORDIS_MODULE test option replaces this with real Cordis.
export class FixtureContext {
  constructor() { this.listeners = new Map(); }
  on(event, listener) {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return () => listeners.splice(listeners.indexOf(listener), 1);
  }
  waterfall(event, payload, innermost) {
    let chain = innermost;
    for (const listener of [...(this.listeners.get(event) ?? [])].reverse()) {
      const inner = chain;
      chain = () => listener(payload, inner);
    }
    return chain();
  }
}
