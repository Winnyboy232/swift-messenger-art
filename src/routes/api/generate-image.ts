import { createFileRoute } from "@tanstack/react-router";

type Body = { prompt?: string };

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as Body;
        if (!prompt || !prompt.trim()) {
          return new Response("Prompt is required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt: prompt.trim(),
            quality: "low",
            size: "1024x1024",
            n: 1,
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          return new Response(detail || "Image generation failed", { status: upstream.status });
        }

        const json = (await upstream.json()) as { data?: { b64_json?: string }[] };
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) return new Response("No image returned", { status: 502 });

        return Response.json({ b64 });
      },
    },
  },
});
