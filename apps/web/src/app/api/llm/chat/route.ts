import { NextRequest, NextResponse } from "next/server";
import {
	SYSTEM_PROMPT,
	TOOL_DEFINITIONS,
	createLLMStream,
	type LLMConfig,
	type LLMChatMessage,
} from "@/services/llm";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { messages, config } = body as {
			messages: LLMChatMessage[];
			config: LLMConfig;
		};

		if (!messages || !config) {
			return NextResponse.json(
				{ error: "Missing required fields: messages, config" },
				{ status: 400 },
			);
		}

		if (!config.apiKey) {
			return NextResponse.json(
				{ error: "API key is required. Configure it in the AI Assistant settings." },
				{ status: 400 },
			);
		}

		// Inject system prompt if not present
		const hasSystemMessage = messages.some((m) => m.role === "system");
		const fullMessages: LLMChatMessage[] = hasSystemMessage
			? messages
			: [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

		// Create a streaming response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of createLLMStream(config, fullMessages, TOOL_DEFINITIONS)) {
						const data = JSON.stringify(chunk);
						controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
					}
					controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					controller.enqueue(
						new TextEncoder().encode(
							`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`,
						),
					);
				} finally {
					controller.close();
				}
			},
		});

		return new NextResponse(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
