# Pi Model Provider Native Prompting

Provider-informed, harness-neutral native-prompting guidance for Pi.

`pi-model-provider-native-prompting` adds a small prompt overlay to Pi's generated system prompt. It nudges the active model toward careful coding-agent behavior without adding tools, commands, permissions, task trackers, provider payload rewrites, or a replacement prompt.

## Why This Exists

Model providers know their models best, and their native coding-agent harnesses encode hard-won lessons about planning, editing, validation, context use, and user-change safety.

Pi is its own harness. Claude-in-Pi is not Claude Code; a Codex model in Pi is not Codex CLI; Gemini in Pi is not Gemini CLI. This package distills only the portable, harness-neutral parts of those provider-native prompting patterns into Pi's active prompt.

It does **not** vendor, copy, or recreate Claude Code, Codex CLI, or Gemini CLI prompts.

## Install

Install from npm:

```bash
pi install npm:pi-model-provider-native-prompting
```

Try it without installing:

```bash
pi -e npm:pi-model-provider-native-prompting
```

Install from GitHub:

```bash
pi install git:github.com/henryennis/pi-model-provider-native-prompting
```

Pin a release tag:

```bash
pi install git:github.com/henryennis/pi-model-provider-native-prompting@v0.2.3
```

## What It Does

On each user prompt, the extension uses Pi's `before_agent_start` hook to insert a compact `Model Provider Native Prompting Overlay` into the current system prompt.

The overlay tells the model to:

- use only capabilities present in the active prompt or tool list,
- gather enough context before acting,
- make focused changes that match local conventions,
- avoid unrelated refactors and speculative abstractions,
- protect secrets and system configuration,
- avoid changing version-control state or discarding user work unless asked,
- ask for clarification only when ambiguity affects correctness,
- use context efficiently,
- validate work when the active project or harness provides a reasonable way,
- keep progress and final messages concise and path-aware.

The extension adds provider-family fragments for OpenAI, OpenAI Codex-family, Anthropic, and Google models, plus small capability fragments for reasoning-capable and small-context models.

## What It Does Not Do

This package is intentionally prompt-only. It does **not**:

- add LLM-callable tools,
- add slash commands,
- add `update_plan`, todos, or task tracking,
- add permission gates or sandboxing,
- rewrite provider request payloads,
- modify tool calls or tool results,
- replace Pi's generated system prompt,
- copy Claude Code, Codex CLI, or Gemini CLI prompts.

Model family is not harness identity. The overlay explicitly tells the model not to assume optional harness capabilities unless they appear in the active instructions or tool list.

## Model-Aware Behavior

| Active model metadata | Added guidance |
| --- | --- |
| OpenAI provider/API or `gpt-*` id | OpenAI-family guidance |
| OpenAI Codex provider or `codex` id | OpenAI-family + OpenAI Codex-family guidance |
| Anthropic provider/API or `claude` id | Anthropic-family guidance |
| Google/Gemini provider/API/id | Google-family guidance |
| `model.reasoning === true` | Reasoning-model guidance |
| `model.contextWindow < 64000` | Small-context guidance |
| Unknown/custom model | Universal overlay only |

Provider fragments are additive; they never replace the universal overlay. Codex-family models also receive OpenAI-family guidance because Codex is an OpenAI model family.

## Compatibility

- Tested with Pi Coding Agent `0.72.1`.
- Requires a Pi version that supports the `before_agent_start` extension event with a current system prompt.
- Runtime dependencies: none.
- Build step: none.

The package is dependency-free JavaScript ESM so Pi can load it directly.

## Local Development

From this repository:

```bash
npm run check
npm run pack:dry-run
```

Run with a local checkout without writing Pi settings:

```bash
pi -e .
```

A no-LLM smoke test:

```bash
PI_OFFLINE=1 pi --no-session --no-extensions -e .
```

Confirm the startup header lists `model-provider-native-prompting.js` under `[Extensions]`.

## Debugging

There is no debug command because the extension has no runtime state and no configuration. To inspect what will be inserted, read `extensions/model-provider-native-prompting.js`; the exported overlay helpers are covered by tests.

If behavior seems wrong:

1. Run `pi --no-extensions -e .` from the checkout to isolate this package from other extensions.
2. Check that the model metadata matches the expected provider family.
3. Check for an existing `&lt;!-- pi-model-provider-native-prompting --&gt;` marker in the prompt; duplicate insertion is intentionally skipped.

## Uninstall

If installed from npm:

```bash
pi remove npm:pi-model-provider-native-prompting
```

If installed from GitHub:

```bash
pi remove git:github.com/henryennis/pi-model-provider-native-prompting
```

## Design Notes

This package came from comparing the harness-agnostic subset of Pi, OpenAI Codex CLI, Claude Code, and Gemini CLI. The result is intentionally anti-unified: a small behavioral overlay rather than a port of any one harness.

For project history and security reporting, see the repository files on GitHub:

- `CHANGELOG.md`
- `SECURITY.md`

## License

MIT
