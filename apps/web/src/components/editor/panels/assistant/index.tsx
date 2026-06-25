"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistantStore, type ChatMessage } from "./assistant-store";
import { LLM_MODELS, DEFAULT_LLM_CONFIGS } from "@/services/llm";
import { nanoid } from "nanoid";

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
	} = useAssistantStore();

	const [input, setInput] = useState("");
	const [streamingContent, setStreamingContent] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingContent]);

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

			if (fullContent) {
				const assistantMessage: ChatMessage = {
					id: nanoid(),
					role: "assistant",
					content: fullContent,
					timestamp: Date.now(),
				};
				addMessage(assistantMessage);
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
	}, [input, isStreaming, config, messages, addMessage, setStreaming]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const isEmpty = messages.length === 0;

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
								"Apply cyberpunk style",
								"Add text overlay centered",
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
