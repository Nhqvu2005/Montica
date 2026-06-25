import { create } from "zustand";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

export interface AssistantConfig {
	provider: "openai" | "anthropic" | "ollama";
	apiKey: string;
	model: string;
	baseUrl: string;
}

const DEFAULT_CONFIG: AssistantConfig = {
	provider: "openai",
	apiKey: "",
	model: "gpt-4o",
	baseUrl: "https://api.openai.com/v1",
};

interface AssistantState {
	// Chat
	messages: ChatMessage[];
	isStreaming: boolean;
	addMessage: (msg: ChatMessage) => void;
	setStreaming: (streaming: boolean) => void;
	clearMessages: () => void;

	// Config
	config: AssistantConfig;
	setConfig: (config: Partial<AssistantConfig>) => void;
	isConfigOpen: boolean;
	setConfigOpen: (open: boolean) => void;
}

export const useAssistantStore = create<AssistantState>()((set) => ({
	// Chat state
	messages: [],
	isStreaming: false,
	addMessage: (msg) =>
		set((state) => ({ messages: [...state.messages, msg] })),
	setStreaming: (streaming) => set({ isStreaming: streaming }),
	clearMessages: () => set({ messages: [] }),

	// Config
	config: DEFAULT_CONFIG,
	setConfig: (partial) =>
		set((state) => ({ config: { ...state.config, ...partial } })),
	isConfigOpen: false,
	setConfigOpen: (open) => set({ isConfigOpen: open }),
}));
