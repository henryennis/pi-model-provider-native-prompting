# Security Policy

## Supported Versions

Only the latest published version of `pi-model-provider-native-prompting` is supported.

This project intentionally does not provide backwards-compatibility aliases for historical package names.

## Scope

This package is prompt-only:

- no runtime dependencies,
- no network calls,
- no LLM-callable tools,
- no shell wrappers,
- no permission gates,
- no provider payload rewriting,
- no persistent state.

Security-relevant issues are still possible if the prompt overlay accidentally encourages unsafe behavior, assumes unavailable runtime authority, leaks sensitive context, or conflicts with Pi's active tool and permission model.

## Reporting a Vulnerability

Please do not publish exploit details, credentials, tokens, or private prompts in a public issue.

Preferred reporting path:

1. Use GitHub private vulnerability reporting for this repository, if available.
2. If private reporting is unavailable, open a public issue asking for a private contact path and include only a high-level description.

Useful reports include:

- affected package version,
- Pi version,
- active model/provider metadata if relevant,
- minimal reproduction steps,
- the exact unsafe instruction or behavior observed,
- whether other Pi extensions were enabled.

## Token Hygiene

If an npm token, API key, or credential is accidentally pasted into an issue, discussion, log, or chat transcript, revoke and rotate it immediately. Deleting the visible text is not sufficient.
