import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import modelProviderNativePrompting, {
	OVERLAY_MARKER,
	buildOverlay,
	classifyModel,
	getCurrentSystemPrompt,
	getProviderOverlayKeys,
	insertOverlay,
} from "../extensions/model-provider-native-prompting.js";

const baseModel = {
	id: "example",
	provider: "example",
	api: "example-api",
	reasoning: false,
	contextWindow: 128000,
};

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("package manifest", () => {
	it("declares a precise Pi extension entrypoint", () => {
		assert.deepEqual(packageJson.pi.extensions, ["./extensions/model-provider-native-prompting.js"]);
	});

	it("ships only runtime files in the npm tarball", () => {
		assert.deepEqual(packageJson.files, [
			"extensions/model-provider-native-prompting.js",
			"README.md",
			"LICENSE",
		]);
	});

	it("is discoverable as a Pi package", () => {
		assert.ok(packageJson.keywords.includes("pi-package"));
		assert.equal(packageJson.peerDependencies["@mariozechner/pi-coding-agent"], ">=0.72.0");
	});
});

describe("classifyModel", () => {
	it("classifies OpenAI models by provider", () => {
		assert.equal(classifyModel({ ...baseModel, provider: "openai", id: "gpt-5" }), "openai");
	});

	it("classifies Anthropic models by provider", () => {
		assert.equal(classifyModel({ ...baseModel, provider: "anthropic", id: "claude-sonnet-4-5" }), "anthropic");
	});

	it("classifies Google models by id", () => {
		assert.equal(classifyModel({ ...baseModel, provider: "custom", id: "gemini-2.5-pro" }), "google");
	});

	it("classifies Codex models before generic OpenAI", () => {
		assert.equal(classifyModel({ ...baseModel, provider: "openai", id: "gpt-5.2-codex" }), "openai-codex");
	});

	it("keeps unknown models generic", () => {
		assert.equal(classifyModel({ ...baseModel, provider: "custom", api: "custom", id: "local-model" }), "generic");
	});

	it("falls back to generic without a model", () => {
		assert.equal(classifyModel(undefined), "generic");
	});
});

describe("getProviderOverlayKeys", () => {
	it("layers OpenAI-family guidance before Codex-specific guidance", () => {
		assert.deepEqual(
			getProviderOverlayKeys({ ...baseModel, provider: "openai-codex", id: "gpt-5.5" }),
			["openai", "openai-codex"],
		);
	});

	it("layers OpenAI-family guidance for Codex ids under the OpenAI provider", () => {
		assert.deepEqual(
			getProviderOverlayKeys({ ...baseModel, provider: "openai", id: "gpt-5.2-codex" }),
			["openai", "openai-codex"],
		);
	});

	it("keeps generic OpenAI models out of Codex-specific guidance", () => {
		assert.deepEqual(
			getProviderOverlayKeys({ ...baseModel, provider: "openai", id: "gpt-5.5" }),
			["openai"],
		);
	});

	it("returns no provider overlays for unknown models", () => {
		assert.deepEqual(getProviderOverlayKeys({ ...baseModel, provider: "custom", id: "local-model" }), []);
	});
});

describe("buildOverlay", () => {
	it("includes capability overlays for reasoning and small context models", () => {
		const overlay = buildOverlay({ ...baseModel, reasoning: true, contextWindow: 32000 });

		assert.match(overlay, /Model Provider Native Prompting Overlay/);
		assert.match(overlay, /Reasoning Model Guidance/);
		assert.match(overlay, /Small Context Guidance/);
	});

	it("includes provider overlays for known families", () => {
		const overlay = buildOverlay({ ...baseModel, provider: "google", id: "gemini-2.5-flash" });

		assert.match(overlay, /Google-Family Guidance/);
	});

	it("includes OpenAI-family guidance for Codex-family models", () => {
		const overlay = buildOverlay({ ...baseModel, provider: "openai-codex", id: "gpt-5.5", reasoning: true });

		assert.match(overlay, /OpenAI-Family Guidance/);
		assert.match(overlay, /Be explicit about what is known, what is assumed, and what will be verified\./);
		assert.match(overlay, /OpenAI Codex-Family Guidance/);
		assert.ok(overlay.indexOf("OpenAI-Family Guidance") < overlay.indexOf("OpenAI Codex-Family Guidance"));
	});

	it("keeps generic OpenAI models out of Codex-specific guidance", () => {
		const overlay = buildOverlay({ ...baseModel, provider: "openai", id: "gpt-5.5" });

		assert.match(overlay, /OpenAI-Family Guidance/);
		assert.doesNotMatch(overlay, /OpenAI Codex-Family Guidance/);
	});

	it("keeps provider overlays additive", () => {
		const overlay = buildOverlay({ ...baseModel, provider: "anthropic", id: "claude-sonnet-4-5" });

		assert.match(overlay, /Model Provider Native Prompting Overlay/);
		assert.match(overlay, /Anthropic-Family Guidance/);
	});

	it("does not assume optional harness capabilities exist", () => {
		const overlay = buildOverlay({ ...baseModel, provider: "openai", id: "gpt-5.2-codex", reasoning: true, contextWindow: 32000 });

		assert.match(overlay, /Do not assume any tool, permission mode, workflow, memory, task tracker, version-control system, sandbox, or review mode exists/);
		assert.match(overlay, /Use only capabilities that are explicitly available in the active harness/);
		assert.doesNotMatch(overlay, /Pi exposes/);
		assert.doesNotMatch(overlay, /Pi's actual tools/);
		assert.doesNotMatch(overlay, /review mode, lead/);
		assert.doesNotMatch(overlay, /reads and command output/);
	});
});

describe("insertOverlay", () => {
	it("inserts before project context", () => {
		const prompt = "Base\n\n# Project Context\nContext";
		const result = insertOverlay(prompt, "Overlay");

		assert.equal(result, "Base\n\nOverlay\n\n# Project Context\nContext");
	});

	it("inserts before skills when project context is absent", () => {
		const prompt = "Base\n\nThe following skills provide specialized instructions";
		const result = insertOverlay(prompt, "Overlay");

		assert.equal(result, "Base\n\nOverlay\n\nThe following skills provide specialized instructions");
	});

	it("inserts before current date when no richer anchor exists", () => {
		const prompt = "Base\nCurrent date: 2026-05-03";
		const result = insertOverlay(prompt, "Overlay");

		assert.equal(result, "Base\n\nOverlay\nCurrent date: 2026-05-03");
	});

	it("appends only when no known anchor exists", () => {
		const prompt = "Base";
		const result = insertOverlay(prompt, "Overlay");

		assert.equal(result, "Base\n\nOverlay");
	});

	it("does not insert twice", () => {
		const prompt = `Base\n\n${OVERLAY_MARKER}\nCurrent date: 2026-05-03`;
		const result = insertOverlay(prompt, "Overlay");

		assert.equal(result, prompt);
	});

	it("preserves unrelated prompt content byte-for-byte", () => {
		const prompt = [
			"You are Pi.",
			"",
			"Tools stay here.",
			"",
			"# Project Context",
			"Project instructions stay here.",
			"",
			"Current date: 2026-05-03",
		].join("\n");
		const overlay = `Overlay\n${OVERLAY_MARKER}`;
		const result = insertOverlay(prompt, overlay);

		assert.equal(result, [
			"You are Pi.",
			"",
			"Tools stay here.",
			"",
			"Overlay",
			OVERLAY_MARKER,
			"",
			"# Project Context",
			"Project instructions stay here.",
			"",
			"Current date: 2026-05-03",
		].join("\n"));
	});
});

describe("getCurrentSystemPrompt", () => {
	it("uses ctx.getSystemPrompt when Pi provides it", () => {
		const result = getCurrentSystemPrompt(
			{ systemPrompt: "event prompt" },
			{ getSystemPrompt: () => "current chained prompt" },
		);

		assert.equal(result, "current chained prompt");
	});

	it("falls back to the event prompt", () => {
		assert.equal(getCurrentSystemPrompt({ systemPrompt: "event prompt" }, {}), "event prompt");
	});
});

describe("modelProviderNativePrompting", () => {
	it("registers only one before_agent_start hook and returns only a systemPrompt patch", async () => {
		const registrations = [];
		const pi = {
			on(name, handler) {
				registrations.push({ name, handler });
			},
			registerTool() {
				throw new Error("must not register tools");
			},
			registerCommand() {
				throw new Error("must not register commands");
			},
		};

		modelProviderNativePrompting(pi);

		assert.deepEqual(registrations.map((entry) => entry.name), ["before_agent_start"]);

		const result = await registrations[0].handler(
			{ systemPrompt: "event prompt\nCurrent date: 2026-05-03" },
			{
				model: baseModel,
				getSystemPrompt: () => "current chained prompt\nCurrent date: 2026-05-03",
			},
		);

		assert.deepEqual(Object.keys(result), ["systemPrompt"]);
		assert.match(result.systemPrompt, /current chained prompt/);
		assert.doesNotMatch(result.systemPrompt, /event prompt/);
		assert.match(result.systemPrompt, new RegExp(OVERLAY_MARKER));
	});
});
