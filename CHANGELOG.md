# Changelog

All notable changes to `pi-model-provider-native-prompting` are documented here.

## 0.2.2

- Removed internal research/planning notes from the public repository and rewritten git history.
- Removed README references to internal design-note files.
- Published a sanitized README for npm and the Pi package browser.

No runtime behavior changed in this release.

## 0.2.1

- Polished public README positioning and install instructions.
- Removed stale local-path and pre-publication wording from public docs.
- Escaped the overlay marker in README so package browsers do not treat it as an HTML comment.
- Added a security policy.

No runtime behavior changed in this release.

## 0.2.0

- Renamed package from `pi-agent-discipline` to `pi-model-provider-native-prompting`.
- Renamed runtime extension entrypoint to `extensions/model-provider-native-prompting.js`.
- Updated npm/GitHub metadata for the new package identity.
- Published the renamed package to npm and the Pi package browser.
- Intentionally unpublished the historical `pi-agent-discipline` npm package; no backwards-compatibility alias is provided.

## 0.1.0

- Initial prompt-only Pi extension release under the historical `pi-agent-discipline` name.
- Added conservative universal overlay, provider-family fragments, model capability fragments, tests, CI, and npm packaging.
