"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistantStore, type ChatMessage, type PendingAction } from "./assistant-store";
import { LLM_MODELS, DEFAULT_LLM_CONFIGS } from "@/services/llm";
import { nanoid } from "nanoid";
import {
	parseLLMToolCalls,
	executeVibeActions,
} from "@/vibe-engine";
import type { VibeAction, VibeEditResult } from "@/vibe-engine";
import { EditorCore } from "@/core";

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";
	return (
		<div
			className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
		>
			<div
				className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground"
				}`}
			>
				{message.content}
			</div>
		</div>
	);
}

function ConfigDialog({ onClose }: { onClose: () => void }) {
	const { config, setConfig } = useAssistantStore();
	const [localConfig, setLocalConfig] = useState({ ...config });
	const [showApiKey, setShowApiKey] = useState(false);

	const handleSave = () => {
		setConfig(localConfig);
		onClose();
	};

	const providerModels = LLM_MODELS[localConfig.provider];
	const defaultCfg = DEFAULT_LLM_CONFIGS[localConfig.provider];

	return (
		<div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
			<div className="bg-background mx-4 w-full max-w-sm rounded-lg border p-4 shadow-lg">
				<h3 className="mb-4 text-sm font-medium">AI Settings</h3>

				<div className="mb-3">
					<label className="mb-1 block text-xs text-muted-foreground">Provider</label>
					<select
						className="w-full rounded border bg-transparent px-2 py-1.5 text-sm"
						value={localConfig.provider}
						onChange={(e) => {
							const provider = e.target.value as typeof localConfig.provider;
							setLocalConfig({
								...localConfig,
								provider,
								model: DEFAULT_LLM_CONFIGS[provider].model,
								baseUrl: DEFAULT_LLM_CONFIGS[provider].baseUrl,
							});
						}}
					>
						<option value="openai">OpenAI</option>
						<option value="anthropic">Anthropic</option>
						<option value="ollama">Ollama (Local)</option>
					</select>
				</div>

				<div className="mb-3">
					<label className="mb-1 block text-xs text-muted-foreground">
						API Key {localConfig.provider === "ollama" ? "(not needed for local)" : ""}
					</label>
					<div className="relative">
						<input
							type={showApiKey ? "text" : "password"}
							className="w-full rounded border bg-transparent px-2 py-1.5 pr-8 text-sm"
							value={localConfig.apiKey}
							onChange={(e) =>
								setLocalConfig({ ...localConfig, apiKey: e.target.value })
							}
							placeholder={
								localConfig.provider === "ollama"
									? "Not needed for local models"
									: "sk-..."
							}
							disabled={localConfig.provider === "ollama"}
						/>
						<button
							className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
							onClick={() => setShowApiKey(!showApiKey)}
						>
							{showApiKey ? "Hide" : "Show"}
						</button>
					</div>
				</div>

				<div className="mb-3">
					<label className="mb-1 block text-xs text-muted-foreground">Model</label>
					<select
						className="w-full rounded border bg-transparent px-2 py-1.5 text-sm"
						value={localConfig.model}
						onChange={(e) =>
							setLocalConfig({ ...localConfig, model: e.target.value })
						}
					>
						{providerModels.map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>
				</div>

				<div className="mb-3">
					<label className="mb-1 block text-xs text-muted-foreground">
						Base URL {localConfig.provider === "ollama" ? "(e.g. http://localhost:11434)" : ""}
					</label>
					<input
						type="text"
						className="w-full rounded border bg-transparent px-2 py-1.5 text-sm"
						value={localConfig.baseUrl}
						onChange={(e) =>
							setLocalConfig({ ...localConfig, baseUrl: e.target.value })
						}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<button
						className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground"
						onClick={handleSave}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
}

/** Display a pending vibe action with status indicator */
function ActionItem({ action }: { action: PendingAction }) {
	const statusIcon = {
		pending: "○",
		executing: "◌",
		done: "✓",
		failed: "✗",
	}[action.status];

	const statusColor = {
		pending: "text-muted-foreground",
		executing: "text-primary",
		done: "text-green-500",
		failed: "text-red-500",
	}[action.status];

	return (
		<div className={`flex items-center gap-2 text-xs ${statusColor}`}>
			<span className="w-4 text-center">{statusIcon}</span>
			<span>{action.label}</span>
		</div>
	);
}

function ActionConfirmation({
	actions,
	onApply,
	onCancel,
	isExecuting,
}: {
	actions: PendingAction[];
	onApply: () => void;
	onCancel: () => void;
	isExecuting: boolean;
}) {
	return (
		<div className="mb-3 rounded-lg border bg-muted/30 p-3">
			<h4 className="mb-2 text-xs font-medium">Pending Changes ({actions.length})</h4>
			<div className="mb-3 space-y-1">
				{actions.map((action, i) => (
					<ActionItem key={i} action={action} />
				))}
			</div>
			<div className="flex gap-2">
				<button
					className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
					onClick={onApply}
					disabled={isExecuting}
				>
					{isExecuting ? "Applying..." : "Apply Changes"}
				</button>
				<button
					className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
					onClick={onCancel}
					disabled={isExecuting}
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

function VibeResultBanner({ result, onUndo }: { result: VibeEditResult; onUndo: () => void }) {
	return (
		<div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
			<h4 className="mb-1 text-xs font-medium text-green-500">
				✓ Applied {result.succeeded} change{result.succeeded !== 1 ? "s" : ""}
			</h4>
			<div className="space-y-0.5">
				{result.results.map((r, i) => (
					<div
						key={i}
						className={`text-xs ${r.success ? "text-muted-foreground" : "text-red-400"}`}
					>
						{r.success ? "✓" : "✗"} {r.action.type}
						{r.error && !r.success ? `: ${r.error}` : ""}
					</div>
				))}
			</div>
			<button
				className="mt-2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
				onClick={onUndo}
			>
				↩ Undo
			</button>
		</div>
	);
}

export function AssistantPanel() {
	const {
		messages,
		isStreaming,
		addMessage,
		setStreaming,
		clearMessages,
		config,
		isConfigOpen,
		setConfigOpen,
		pendingActions,
		setPendingActions,
		updateActionStatus,
		clearPendingActions,
		vibeResult,
		setVibeResult,
	} = useAssistantStore();

	const [input, setInput] = useState("");
	const [streamingContent, setStreamingContent] = useState("");
	const [isExecuting, setIsExecuting] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingContent, pendingActions, vibeResult]);

	/** Apply pending actions via vibe engine */
	const handleApplyActions = useCallback(() => {
		if (pendingActions.length === 0) return;

		setIsExecuting(true);

		// Mark all as executing
		pendingActions.forEach((_, i) => updateActionStatus(i, "executing"));

		try {
			const editor = EditorCore.getInstance();
			const actions = pendingActions.map((pa) => {
				return { type: pa.type, params: pa.params } as VibeAction;
			});

			const result = executeVibeActions(actions, editor);

			// Update status per action
			result.results.forEach((r, i) => {
				updateActionStatus(i, r.success ? "done" : "failed");
			});

			setVibeResult(result);
		} catch (error) {
			console.error("[Vibe] Execution error:", error);
		} finally {
			setIsExecuting(false);
		}
	}, [pendingActions, updateActionStatus, setVibeResult]);

	const handleUndoVibe = useCallback(() => {
		try {
			const editor = EditorCore.getInstance();
			editor.command.undo();
		} catch (error) {
			console.error("[Vibe] Undo error:", error);
		}
		setVibeResult(null);
	}, [setVibeResult]);

	const handleCancelActions = useCallback(() => {
		clearPendingActions();
	}, [clearPendingActions]);

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || isStreaming || !config.apiKey) return;

		setInput("");

		const userMessage: ChatMessage = {
			id: nanoid(),
			role: "user",
			content: text,
			timestamp: Date.now(),
		};
		addMessage(userMessage);
		setStreaming(true);
		setStreamingContent("");
		setPendingActions([]);
		setVibeResult(null);

		try {
			const response = await fetch("/api/llm/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: messages.map((m) => ({ role: m.role, content: m.content })),
					config: {
						provider: config.provider,
						apiKey: config.apiKey,
						model: config.model,
						baseUrl: config.baseUrl,
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					(errorData as { error?: string }).error || `HTTP ${response.status}`,
				);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response stream");

			const decoder = new TextDecoder();
			let fullContent = "";
			let buffer = "";
			const collectedToolCalls: Array<{
				name: string;
				arguments: Record<string, unknown>;
			}> = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();
						if (data === "[DONE]") continue;

						try {
							const parsed = JSON.parse(data);
							if (parsed.type === "text" && parsed.content) {
								fullContent += parsed.content;
								setStreamingContent(fullContent);
							} else if (parsed.type === "tool_call" && parsed.toolCall) {
								collectedToolCalls.push(parsed.toolCall);
							} else if (parsed.type === "error") {
								throw new Error(parsed.error);
							}
						} catch (e) {
							if (e instanceof SyntaxError) continue;
							throw e;
						}
					}
				}
			}

			// Show assistant text message if there was any
			if (fullContent) {
				const assistantMessage: ChatMessage = {
					id: nanoid(),
					role: "assistant",
					content: fullContent,
					timestamp: Date.now(),
				};
				addMessage(assistantMessage);
			}

			// Check for tool calls and convert to pending actions
			if (collectedToolCalls.length > 0) {
				const vibeActions = parseLLMToolCalls(collectedToolCalls);
				if (vibeActions.length > 0) {
					const pendingItems: PendingAction[] = vibeActions.map((a) => ({
						type: a.type,
						params: a.params as Record<string, unknown>,
						status: "pending",
						label: actionToLabel(a),
					}));
					setPendingActions(pendingItems);
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			const errorMsg: ChatMessage = {
				id: nanoid(),
				role: "assistant",
				content: `Error: ${errorMessage}`,
				timestamp: Date.now(),
			};
			addMessage(errorMsg);
		} finally {
			setStreaming(false);
			setStreamingContent("");
		}
	}, [input, isStreaming, config, messages, addMessage, setStreaming, setPendingActions, setVibeResult]);

	/** Convert a VibeAction to a human-readable label */
	function actionToLabel(action: VibeAction): string {
		switch (action.type) {
			case "apply_effect":
				return `Apply ${action.params.effectType} effect`;
			case "add_transition":
				return `Add ${action.params.transitionType} transition`;
			case "set_property":
				return `Set ${action.params.property} to ${action.params.value}`;
			case "add_text":
				return `Add text: "${action.params.text.slice(0, 30)}"`;
			case "set_color_grade":
				return `Apply color grading${action.params.look ? ` (${action.params.look})` : ""}`;
			case "apply_template":
				return `Apply "${action.params.templateId}" style`;
			case "batch":
				return `Batch (${action.params.actions?.length ?? 0} actions)`;
			default:
				return "Unknown action";
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const isEmpty = messages.length === 0 && pendingActions.length === 0 && !vibeResult;

	return (
		<div className="panel bg-background relative flex h-full flex-col overflow-hidden rounded-sm border">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-3 py-2">
				<h2 className="text-xs font-medium">AI Assistant</h2>
				<div className="flex items-center gap-1">
					<button
						className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
						onClick={() => clearMessages()}
						disabled={isEmpty}
						title="Clear chat"
					>
						Clear
					</button>
					<button
						className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
						onClick={() => setConfigOpen(true)}
						title="Settings"
					>
						Settings
					</button>
				</div>
			</div>

			{/* Config dialog */}
			{isConfigOpen && <ConfigDialog onClose={() => setConfigOpen(false)} />}

			{/* Messages area */}
			<div className="flex-1 overflow-y-auto p-3">
				{isEmpty ? (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<div className="mb-2 text-2xl">🎬</div>
						<p className="mb-1 text-sm font-medium">Montica AI Assistant</p>
						<p className="max-w-[200px] text-xs text-muted-foreground">
							Describe what you want to create and I'll help you edit.
						</p>
						<div className="mt-4 flex flex-col gap-1.5">
							{[
								"Make this clip cinematic",
								"Add a glitch effect",
								"Apply Montica Cyan style",
								"Remove background (chroma key)",
							].map((suggestion) => (
								<button
									key={suggestion}
									className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
									onClick={() => {
										setInput(suggestion);
										inputRef.current?.focus();
									}}
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>
				) : (
					<>
						{messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} />
						))}

						{/* Pending actions confirmation */}
						{pendingActions.length > 0 && !isExecuting && (
							<ActionConfirmation
								actions={pendingActions}
								onApply={handleApplyActions}
								onCancel={handleCancelActions}
								isExecuting={isExecuting}
							/>
						)}

						{/* Vibe execution progress */}
						{pendingActions.length > 0 && isExecuting && (
							<div className="mb-3 rounded-lg border bg-muted/30 p-3">
								<h4 className="mb-2 text-xs font-medium">Executing...</h4>
								<div className="space-y-1">
									{pendingActions.map((action, i) => (
										<ActionItem key={i} action={action} />
									))}
								</div>
							</div>
						)}

						{/* Vibe result */}
						{vibeResult && (
							<VibeResultBanner result={vibeResult} onUndo={handleUndoVibe} />
						)}

						{/* Streaming text */}
						{isStreaming && streamingContent && (
							<div className="flex justify-start mb-3">
								<div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed bg-muted text-muted-foreground">
									{streamingContent}
									<span className="ml-0.5 animate-pulse">▊</span>
								</div>
							</div>
						)}
						{isStreaming && !streamingContent && (
							<div className="flex justify-start mb-3">
								<div className="rounded-lg bg-muted px-3 py-2 text-sm">
									<span className="inline-flex gap-1">
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
									</span>
								</div>
							</div>
						)}
					</>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<div className="border-t p-2">
				<div className="flex items-end gap-2">
					<textarea
						ref={inputRef}
						className="max-h-32 min-h-[36px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
						placeholder={config.apiKey ? "Describe what you want to do..." : "Configure API key in Settings..."}
						rows={1}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isStreaming || !config.apiKey}
					/>
					<button
						className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
						onClick={handleSend}
						disabled={!input.trim() || isStreaming || !config.apiKey}
						title="Send"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M22 2L11 13" />
							<path d="M22 2L15 22L11 13L2 9L22 2Z" />
						</svg>
					</button>
				</div>
				{!config.apiKey && (
					<p className="mt-1 text-xs text-muted-foreground">
						Open Settings to configure your API key
					</p>
				)}
			</div>
		</div>
	);
}