import { createFileRoute } from "@tanstack/react-router";
import { streamText, generateText, type ModelMessage } from "ai";
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
        let streamErr = '';
        const result = streamText({
          onError: ({ error }) => { streamErr = String((error as Error)?.stack ?? error); },
          model: gateway("google/gemini-3.6-flash"),
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ] as ModelMessage[],
        });

        try { const g = await generateText({ model: gateway('google/gemini-3.6-flash'), messages: [{ role: 'user', content: 'hi' }] }); return new Response('GEN:' + g.text); } catch (e) { return new Response('ERR: ' + (e as Error).message + ' | ' + streamErr, { status: 500 }); }
      },
    },
  },
});
