import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT =
  "You are Swift AI, the built-in assistant of the Swift messaging app. " +
  "Be concise, friendly and helpful. Use markdown sparingly.";

type ChatBody = { messages?: { role: "user" | "assistant"; content: string }[] };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ] as ModelMessage[],
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (error) {
              controller.enqueue(
                encoder.encode(
                  `\n[Swift AI error: ${error instanceof Error ? error.message : "unknown"}]`,
                ),
              );
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
