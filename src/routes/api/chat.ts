import { createFileRoute } from "@tanstack/react-router";
import { generateText, type ModelMessage } from "ai";
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

        let text: string;
        try {
          const result = await generateText({
            model: gateway("google/gemini-3.6-flash"),
            system: SYSTEM_PROMPT,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })) as ModelMessage[],
          });
          text = result.text;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Swift AI failed";
          const status = /rate limit|429/i.test(message) ? 429 : /402/.test(message) ? 402 : 500;
          return new Response(message, { status });
        }

        // Progressive delivery so the client renders the answer as it arrives.
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const words = text.split(/(\s+)/);
            for (let i = 0; i < words.length; i += 3) {
              controller.enqueue(encoder.encode(words.slice(i, i + 3).join("")));
              await new Promise((r) => setTimeout(r, 18));
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
