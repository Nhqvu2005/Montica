export type LLMProvider = "openai" | "anthropic" | "ollama";

export interface LLMConfig {
	provider: LLMProvider;
	apiKey: string;
	baseUrl?: string;
	model: string;
}

export interface LLMChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface LLMToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface LLMToolCall {
	name: string;
	arguments: Record<string, unknown>;
}

export interface LLMChatResponse {
	content: string;
	toolCalls?: LLMToolCall[];
}

export interface LLMChunk {
	type: "text" | "tool_call" | "error" | "done";
	content?: string;
	toolCall?: LLMToolCall;
	error?: string;
}

export const DEFAULT_LLM_CONFIGS: Record<LLMProvider, { baseUrl: string; model: string }> = {
	openai: {
		baseUrl: "https://api.openai.com/v1",
		model: "gpt-4o",
	},
	anthropic: {
		baseUrl: "https://api.anthropic.com/v1",
		model: "claude-sonnet-4-6",
	},
	ollama: {
		baseUrl: "http://localhost:11434",
		model: "llama3.2",
	},
};

export const LLM_MODELS: Record<LLMProvider, string[]> = {
	openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
	anthropic: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
	ollama: ["llama3.2", "llama3.1", "mistral", "mixtral"],
};
