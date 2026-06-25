import type {
	LLMConfig,
	LLMChatMessage,
	LLMToolDefinition,
	LLMChunk,
	LLMProvider,
} from "./types";
import { DEFAULT_LLM_CONFIGS } from "./types";

function getConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		provider: config.provider,
		apiKey: config.apiKey,
		baseUrl: config.baseUrl || DEFAULT_LLM_CONFIGS[config.provider].baseUrl,
		model: config.model || DEFAULT_LLM_CONFIGS[config.provider].model,
	};
}

function getOpenAiHeaders(config: Required<LLMConfig>): Record<string, string> {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${config.apiKey}`,
	};
}

function getAnthropicHeaders(config: Required<LLMConfig>): Record<string, string> {
	return {
		"Content-Type": "application/json",
		"x-api-key": config.apiKey,
		"anthropic-version": "2023-06-01",
	};
}

function getOllamaHeaders(): Record<string, string> {
	return {
		"Content-Type": "application/json",
	};
}

function buildOpenAiBody(
	messages: LLMChatMessage[],
	tools: LLMToolDefinition[] | undefined,
	config: Required<LLMConfig>,
): string {
	const body: Record<string, unknown> = {
		model: config.model,
		messages,
		stream: true,
	};
	if (tools && tools.length > 0) {
		body.tools = tools.map((t) => ({
			type: "function",
			function: {
				name: t.name,
				description: t.description,
				parameters: t.inputSchema,
			},
		}));
	}
	return JSON.stringify(body);
}

function buildAnthropicBody(
	messages: LLMChatMessage[],
	tools: LLMToolDefinition[] | undefined,
	config: Required<LLMConfig>,
): string {
	// Anthropic uses a different message format: system is separate
	const systemMessages = messages.filter((m) => m.role === "system");
	const chatMessages = messages.filter((m) => m.role !== "system");

	const body: Record<string, unknown> = {
		model: config.model,
		messages: chatMessages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
		stream: true,
		max_tokens: 4096,
	};

	if (systemMessages.length > 0) {
		body.system = systemMessages.map((m) => ({ type: "text", text: m.content }));
	}

	if (tools && tools.length > 0) {
		body.tools = tools.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.inputSchema,
		}));
	}

	return JSON.stringify(body);
}

function buildOllamaBody(
	messages: LLMChatMessage[],
	_tools: LLMToolDefinition[] | undefined,
	config: Required<LLMConfig>,
): string {
	const body: Record<string, unknown> = {
		model: config.model,
		messages,
		stream: true,
	};
	return JSON.stringify(body);
}

function parseOpenAiStream(line: string): LLMChunk | null {
	if (!line.startsWith("data: ")) return null;
	const data = line.slice(6).trim();
	if (!data || data === "[DONE]") return { type: "done" };

	try {
		const parsed = JSON.parse(data);
		const delta = parsed.choices?.[0]?.delta;
		if (!delta) return null;

		if (delta.content) {
			return { type: "text", content: delta.content };
		}

		if (delta.tool_calls?.[0]) {
			const tc = delta.tool_calls[0];
			return {
				type: "tool_call",
				toolCall: {
					name: tc.function?.name || "",
					arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
				},
			};
		}

		return null;
	} catch {
		return null;
	}
}

function parseAnthropicStream(line: string): LLMChunk | null {
	if (!line.startsWith("data: ")) return null;
	const data = line.slice(6).trim();
	if (!data) return null;

	try {
		const parsed = JSON.parse(data);
		if (parsed.type === "content_block_delta" && parsed.delta?.text) {
			return { type: "text", content: parsed.delta.text };
		}
		if (parsed.type === "content_block_start" && parsed.content_block?.text) {
			return { type: "text", content: parsed.content_block.text };
		}
		if (parsed.type === "message_stop" || parsed.type === "message_complete") {
			return { type: "done" };
		}
		if (parsed.type === "error") {
			return { type: "error", error: parsed.error?.message || "Unknown Anthropic error" };
		}
		return null;
	} catch {
		return null;
	}
}

function parseOllamaStream(line: string): LLMChunk | null {
	try {
		const parsed = JSON.parse(line);
		if (parsed.done) {
			return { type: "done" };
		}
		if (parsed.message?.content) {
			return { type: "text", content: parsed.message.content };
		}
		if (parsed.error) {
			return { type: "error", error: parsed.error };
		}
		return null;
	} catch {
		return null;
	}
}

async function* streamOpenAi(
	config: Required<LLMConfig>,
	messages: LLMChatMessage[],
	tools: LLMToolDefinition[] | undefined,
): AsyncGenerator<LLMChunk> {
	const response = await fetch(`${config.baseUrl}/chat/completions`, {
		method: "POST",
		headers: getOpenAiHeaders(config),
		body: buildOpenAiBody(messages, tools, config),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error");
		yield { type: "error", error: `OpenAI API error (${response.status}): ${errorText}` };
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		yield { type: "error", error: "No response body from OpenAI" };
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				const chunk = parseOpenAiStream(line);
				if (chunk) yield chunk;
			}
		}

		// Process remaining buffer
		if (buffer.trim()) {
			const chunk = parseOpenAiStream(buffer);
			if (chunk) yield chunk;
		}
	} finally {
		reader.releaseLock();
	}
}

async function* streamAnthropic(
	config: Required<LLMConfig>,
	messages: LLMChatMessage[],
	tools: LLMToolDefinition[] | undefined,
): AsyncGenerator<LLMChunk> {
	const response = await fetch(`${config.baseUrl}/messages`, {
		method: "POST",
		headers: getAnthropicHeaders(config),
		body: buildAnthropicBody(messages, tools, config),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error");
		yield { type: "error", error: `Anthropic API error (${response.status}): ${errorText}` };
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		yield { type: "error", error: "No response body from Anthropic" };
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					const chunk = parseAnthropicStream(line);
					if (chunk) yield chunk;
				}
			}
		}

		if (buffer.trim()) {
			const chunk = parseAnthropicStream(buffer);
			if (chunk) yield chunk;
		}
	} finally {
		reader.releaseLock();
	}
}

async function* streamOllama(
	config: Required<LLMConfig>,
	messages: LLMChatMessage[],
	tools: LLMToolDefinition[] | undefined,
): AsyncGenerator<LLMChunk> {
	const response = await fetch(`${config.baseUrl}/api/chat`, {
		method: "POST",
		headers: getOllamaHeaders(),
		body: buildOllamaBody(messages, tools, config),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error");
		yield { type: "error", error: `Ollama error (${response.status}): ${errorText}` };
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		yield { type: "error", error: "No response body from Ollama" };
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					const chunk = parseOllamaStream(line);
					if (chunk) yield chunk;
				}
			}
		}

		if (buffer.trim()) {
			const chunk = parseOllamaStream(buffer);
			if (chunk) yield chunk;
		}
	} finally {
		reader.releaseLock();
	}
}

export function createLLMStream(
	config: LLMConfig,
	messages: LLMChatMessage[],
	tools?: LLMToolDefinition[],
): AsyncGenerator<LLMChunk> {
	const resolved = getConfig(config);

	switch (resolved.provider) {
		case "openai":
			return streamOpenAi(resolved, messages, tools);
		case "anthropic":
			return streamAnthropic(resolved, messages, tools);
		case "ollama":
			return streamOllama(resolved, messages, tools);
		default: {
			const exhaustive: never = resolved.provider;
			throw new Error(`Unknown LLM provider: ${exhaustive}`);
		}
	}
}

export async function sendLLMMessage(
	config: LLMConfig,
	messages: LLMChatMessage[],
	tools?: LLMToolDefinition[],
): Promise<string> {
	let fullContent = "";

	for await (const chunk of createLLMStream(config, messages, tools)) {
		if (chunk.type === "text" && chunk.content) {
			fullContent += chunk.content;
		}
		if (chunk.type === "error") {
			throw new Error(chunk.error);
		}
	}

	return fullContent;
}

export function getProviderFromModel(model: string): LLMProvider {
	if (model.startsWith("gpt") || model.startsWith("o")) return "openai";
	if (model.startsWith("claude")) return "anthropic";
	return "ollama";
}
