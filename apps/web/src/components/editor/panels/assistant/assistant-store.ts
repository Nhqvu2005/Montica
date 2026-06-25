import { create } from "zustand";
import type { VibeEditResult } from "@/vibe-engine";

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

export interface PendingAction {
	type: string;
	params: Record<string, unknown>;
	status: "pending" | "executing" | "done" | "failed";
	label: string;
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

	// Vibe actions (pending tool calls)
	pendingActions: PendingAction[];
	setPendingActions: (actions: PendingAction[]) => void;
	updateActionStatus: (index: number, status: PendingAction["status"]) => void;
	clearPendingActions: () => void;

	// Vibe result
	vibeResult: VibeEditResult | null;
	setVibeResult: (result: VibeEditResult | null) => void;
}

export const useAssistantStore = create<AssistantState>()((set) => ({
	// Chat state
	messages: [],
	isStreaming: false,
	addMessage: (msg) =>
		set((state) => ({ messages: [...state.messages, msg] })),
	setStreaming: (streaming) => set({ isStreaming: streaming }),
	clearMessages: () => set({ messages: [], pendingActions: [], vibeResult: null }),

	// Config
	config: DEFAULT_CONFIG,
	setConfig: (partial) =>
		set((state) => ({ config: { ...state.config, ...partial } })),
	isConfigOpen: false,
	setConfigOpen: (open) => set({ isConfigOpen: open }),

	// Vibe state
	pendingActions: [],
	setPendingActions: (actions) => set({ pendingActions: actions }),
	updateActionStatus: (index, status) =>
		set((state) => ({
			pendingActions: state.pendingActions.map((a, i) =>
				i === index ? { ...a, status } : a,
			),
		})),
	clearPendingActions: () => set({ pendingActions: [] }),

	// Vibe result
	vibeResult: null,
	setVibeResult: (result) => set({ vibeResult: result }),
}));
