# Fast mode: preserve reasoning selection

## Behavior change

`fast_mode` is now a **UI-workflow hint**, not a model-reasoning override.
The tool still supports `on`, `off` and `status`, shares the `fast-mode` marker
with the legacy `fast` CLI, and considers the marker expired after 30 minutes.
The tool cleans up an expired marker when reading status; there is no timer.
The legacy CLI continues to report marker existence only.

The selected model, provider and reasoning effort are left unchanged. For
multi-step UI work, submit a plan to the local `loop` executor, which executes
planned matching, actions and verification without a cloud decision per gesture.
Turning on this marker alone does **not** make model requests faster or disable
thinking. Cloud planning and escalation still use the selected reasoning effort.

### Existing conversations

This change prevents new fast-mode overrides. It does **not** repair an effort
already saved by an older version. After updating to an APK containing this
change and clearing the marker (`fast_mode` with `action: "off"`, or `fast off`),
explicitly reselect a reasoning effort supported by the selected model if needed.
Neither OFF nor the marker's TTL rewrites saved request headers. No prior
selection is inferred or automatically restored.

## Why remove the request hook instead of guarding it?

The previous native asset registered a global `agent/request` listener that
returned `{ ...proposed, reasoningEffort: "off" }` whenever the marker was active.
In the reviewed public SDK (`@deepseek-ai/dsh-agent` and `dsh-agent-loop`
0.2.1-rc.2, `@deepseek-ai/cordis` 4.0.5):

1. Cordis composes request listeners as a waterfall. An earlier global listener
   can overwrite a later scoped model-selection listener **after** awaiting it.
2. `AgentLoop.prepareRequest` takes the final waterfall result, and
   `buildRequest` persists the effective configuration in `request/header`.
3. Session selection without a pending user choice can reuse that effective
   header. Subsequent requests and continuation/child selection may therefore
   inherit the temporary `off` as durable selection.

The flag's TTL limits marker validity, not the lifetime of a persisted header.
A capability check might avoid some unsupported requests, but would still allow
supported temporary values to contaminate durable intent. Advertising `off` in
catalog metadata also does not establish safe restoration. Filtering one model
or provider, translating `off` to another effort, or changing compaction does not
fix that lifecycle boundary.

The reviewed SDK does not expose a supported temporary request-control hook
separate from durable header persistence. Until it does, this asset registers
**no `agent/request` listener**. A future optimization would need an upstream
non-persistent execution override with model-capability validation and explicit
lifecycle semantics. This patch does not add that API or modify the SDK.

The inspected public pi-ai adapter omits its reasoning option for `off`; the
OpenAI Responses payload builder can default an unspecified effort to `none`.
That illustrates one possible unsupported-value failure, not proof that every
provider route uses that serializer. No deployed route, raw request or real
provider call is required or validated by this patch.

## Offline regression checks

No npm install, network, provider credentials or Android build is required:

```sh
node --test scripts/tests/fast-mode*.test.mjs
```

The dependency-free run uses a small waterfall fixture. To additionally exercise
an **already available public** Cordis implementation and isolated public
serializer functions, pass explicit local public-source paths (no runtime
configuration or session paths):

```sh
DSH_TEST_CORDIS_MODULE=/path/to/public/@deepseek-ai/cordis/lib/index.js \
DSH_TEST_PI_ADAPTER_SOURCE=/path/to/public/@deepseek-ai/dsh-llm-pi-ai/lib/index.js \
DSH_TEST_PI_RESPONSES_SOURCE=/path/to/public/@earendil-works/pi-ai/dist/api/openai-responses.js \
node --test scripts/tests/fast-mode*.test.mjs
```

The plugin is loaded unmodified in an isolated, disposable worktree fixture with
a fake `defineTool` dependency at its normal loader path. Marker writes/removals
and legacy CLI calls use only fixture homes, never the device's real marker.
Tests cover legacy overwrite/persistence, absence of patched request listeners,
opaque effort/route/custom-field preservation, marker TTL and immediate toggles,
CLI compatibility, truthful descriptions/results, missing home and loader.

Header, resumed request, goal and child propagation are **source-based fixtures**,
not full SDK service tests. The optional serializer test executes the public
`profileOptions` and `buildParams` function text in a VM with unrelated helpers
mocked; it is not a full adapter/provider pipeline test. No APK build, native UI
validation, deployment or signed release is claimed. Managed instruction seeds
are deliberately outside this patch; any older seed guidance promising skipped
reasoning must be revised by the app's separate managed-seed maintenance process.
