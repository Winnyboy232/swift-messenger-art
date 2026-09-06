import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({ prompt: z.string().trim().min(1).max(1000) });

export const Route = createFileRoute("/api/generate-video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getRequestUserId } = await import("@/lib/route-auth.server");
        if (!(await getRequestUserId(request))) return new Response("Unauthorized", { status: 401 });

        const token = process.env["REPLICATE_API_TOKEN"];
        if (!token) return new Response("Video generation is not configured", { status: 503 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return new Response("A video prompt is required", { status: 400 });

        const predictionResponse = await fetch("https://api.replicate.com/v1/models/minimax/video-01/predictions", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ input: { prompt: parsed.data.prompt } }),
        });
        if (!predictionResponse.ok) {
          const detail = await predictionResponse.text().catch(() => "");
          return new Response(detail || "Video generation failed", { status: predictionResponse.status });
        }

        const prediction = (await predictionResponse.json()) as { id?: string; status?: string; output?: string | string[]; error?: string };
        if (!prediction.id) return new Response("Video provider returned no prediction", { status: 502 });

        for (let attempt = 0; attempt < 24; attempt += 1) {
          if (prediction.status === "succeeded" && prediction.output) break;
          if (prediction.status === "failed" || prediction.status === "canceled") {
            return new Response(prediction.error || "Video generation failed", { status: 502 });
          }
          await new Promise((resolve) => setTimeout(resolve, 2500));
          const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!pollResponse.ok) return new Response("Could not check video status", { status: 502 });
          const next = (await pollResponse.json()) as typeof prediction;
          prediction.status = next.status;
          prediction.output = next.output;
          prediction.error = next.error;
        }

        const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        if (!output) return new Response("Video generation timed out", { status: 504 });
        return Response.json({ url: output, predictionId: prediction.id });
      },
    },
  },
});