const OVERLAY_MARKER = "<!-- pi-model-provider-native-prompting -->";

const UNIVERSAL_OVERLAY = `## Model Provider Native Prompting Overlay
${OVERLAY_MARKER}

These defaults are subordinate to direct user instructions, the active system prompt, project/user context, loaded resources, and tool-specific rules. Do not assume any tool, permission mode, workflow, memory, task tracker, version-control system, sandbox, or review mode exists unless it is present in the active instructions or tool list.

- Use only capabilities that are explicitly available in the active harness; if a capability is absent, adapt rather than naming or inventing it.
- Gather enough context before acting; do not guess when evidence is available through active capabilities.
- When changing files or content, make surgical edits that match local conventions; avoid unrelated refactors and speculative abstractions.
- Protect secrets, credentials, environment files, and system configuration.
- Do not change version-control state or discard user work unless the user explicitly asks.
- Ask only when ambiguity affects correctness or direction.
- Use context efficiently: prefer focused queries, narrow ranges, and concise outputs over broad dumps.
- Validate changes when the active project or harness provides a reasonable way to do so.
- When reviewing, lead with findings ordered by severity and call out risks or testing gaps.
- Keep progress updates and final answers concise, concrete, and path-aware.`;

const REASONING_MODEL_OVERLAY = `## Reasoning Model Guidance

- Use the model's reasoning capacity for tradeoffs, root cause analysis, and validation strategy.
- Keep outward communication concise; do not expose hidden reasoning or over-explain routine steps.`;

const SMALL_CONTEXT_OVERLAY = `## Small Context Guidance

- Be especially selective with added context and generated output.
- Prefer focused queries and narrow ranges when the active harness provides them, unless broader context is necessary for correctness.`;

const PROVIDER_OVERLAYS = {
	openai: `## OpenAI-Family Guidance

- Be explicit about what is known, what is assumed, and what will be verified.
- Do not refer to Codex-specific tools, approval mechanics, or commands unless they appear in the active instructions or tool list.`,
	"openai-codex": `## OpenAI Codex-Family Guidance

- Preserve Codex-like discipline only where it is harness-agnostic: focused changes, validation, concise progress, and user-change safety.
- Use the active harness's tools and lifecycle; do not mention Codex-only commands or patch mechanics unless they are actually available.`,
	anthropic: `## Anthropic-Family Guidance

- Treat project context as factual guidance, not as a reason to ignore higher-priority user instructions.
- Keep plans proportional: use brief prose plans for complex work, skip formal planning for simple requests, and do not assume a named planning mode exists.`,
	google: `## Google-Family Guidance

- Optimize context use without sacrificing correctness; avoid both over-collecting and under-collecting.
- Before modifying content, gather enough surrounding context to make replacements unambiguous.`,
};

const INSERTION_ANCHORS = [
	"\n\n# Project Context",
	"\n\nThe following skills provide specialized instructions",
	"\nCurrent date:",
];

function includesAny(value, needles) {
	return needles.some((needle) => value.includes(needle));
}

function classifyModel(model) {
	if (!model) return "generic";

	const provider = String(model.provider || "").toLowerCase();
	const api = String(model.api || "").toLowerCase();
	const id = String(model.id || "").toLowerCase();
	const openaiLike = includesAny(provider, ["openai", "chatgpt"]) || includesAny(api, ["openai"]);

	if (provider.includes("openai-codex")) return "openai-codex";
	if (provider.includes("anthropic")) return "anthropic";
	if (includesAny(provider, ["google", "gemini"])) return "google";
	if (openaiLike && id.includes("codex")) return "openai-codex";
	if (openaiLike) return "openai";

	if (api.includes("anthropic")) return "anthropic";
	if (api.includes("google")) return "google";

	if (id.includes("codex")) return "openai-codex";
	if (id.includes("claude")) return "anthropic";
	if (id.includes("gemini")) return "google";
	if (id.startsWith("gpt-")) return "openai";

	return "generic";
}

function getProviderOverlayKeys(model) {
	const family = classifyModel(model);

	if (family === "openai-codex") {
		return ["openai", "openai-codex"];
	}

	if (PROVIDER_OVERLAYS[family]) {
		return [family];
	}

	return [];
}

function buildOverlay(model) {
	const parts = [UNIVERSAL_OVERLAY];
	const providerOverlays = getProviderOverlayKeys(model).map((key) => PROVIDER_OVERLAYS[key]);

	if (model?.reasoning) {
		parts.push(REASONING_MODEL_OVERLAY);
	}

	if (typeof model?.contextWindow === "number" && model.contextWindow > 0 && model.contextWindow < 64000) {
		parts.push(SMALL_CONTEXT_OVERLAY);
	}

	parts.push(...providerOverlays);

	return parts.join("\n\n");
}

function insertBeforeFirst(prompt, needles, insertion) {
	for (const needle of needles) {
		const index = prompt.indexOf(needle);
		if (index !== -1) {
			return `${prompt.slice(0, index)}\n\n${insertion}${prompt.slice(index)}`;
		}
	}
	return `${prompt}\n\n${insertion}`;
}

function insertOverlay(systemPrompt, overlay) {
	if (!overlay.trim() || systemPrompt.includes(OVERLAY_MARKER)) {
		return systemPrompt;
	}

	return insertBeforeFirst(systemPrompt, INSERTION_ANCHORS, overlay);
}

function getCurrentSystemPrompt(event, ctx) {
	if (typeof ctx?.getSystemPrompt === "function") {
		return ctx.getSystemPrompt();
	}
	return event.systemPrompt ?? "";
}

export default function modelProviderNativePrompting(pi) {
	pi.on("before_agent_start", async (event, ctx) => {
		const overlay = buildOverlay(ctx.model);
		const systemPrompt = getCurrentSystemPrompt(event, ctx);
		return {
			systemPrompt: insertOverlay(systemPrompt, overlay),
		};
	});
}

export {
	OVERLAY_MARKER,
	INSERTION_ANCHORS,
	PROVIDER_OVERLAYS,
	SMALL_CONTEXT_OVERLAY,
	UNIVERSAL_OVERLAY,
	buildOverlay,
	classifyModel,
	getCurrentSystemPrompt,
	getProviderOverlayKeys,
	insertOverlay,
};
