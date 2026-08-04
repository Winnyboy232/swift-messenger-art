import { supabase } from "@/integrations/supabase/client";

export type MediaIntent = "image" | "video" | null;

const IMAGE_RE =
  /\b(generate|create|make|draw|design|render|paint|sketch)\b[^.?!]*\b(image|picture|photo|art|artwork|illustration|logo|wallpaper|drawing|poster)\b|^\s*(draw|imagine)\b/i;
const VIDEO_RE =
  /\b(generate|create|make|animate|render)\b[^.?!]*\b(video|clip|animation|movie|reel)\b/i;

/** Detects whether a prompt should be routed to the multimedia engines. */
export function detectMediaIntent(text: string): MediaIntent {
  if (VIDEO_RE.test(text)) return "video";
  if (IMAGE_RE.test(text)) return "image";
  return null;
}

/** Strips the leading command words so the model gets a clean subject prompt. */
export function cleanPrompt(text: string): string {
  return text
    .replace(
      /^\s*(please\s+)?(can you\s+)?(generate|create|make|draw|design|render|paint|sketch|imagine|animate)\s+(me\s+)?(an?\s+)?(image|picture|photo|art|artwork|illustration|drawing|video|clip|animation)?\s*(of|showing|with|that says)?\s*/i,
      "",
    )
    .trim();
}

/** Encodes a generated media reference inside an AI chat message. */
export function encodeMedia(kind: "image" | "video", path: string, caption: string): string {
  return `[[${kind}:${path}]]${caption}`;
}

export interface ParsedMessage {
  kind: "image" | "video" | null;
  path: string | null;
  text: string;
}

export function parseMedia(content: string): ParsedMessage {
  const m = /^\[\[(image|video):([^\]]+)\]\]/.exec(content);
  if (!m) return { kind: null, path: null, text: content };
  return {
    kind: m[1] as "image" | "video",
    path: m[2] ?? null,
    text: content.slice(m[0].length).trim(),
  };
}

/** Draws the "Swift AI" watermark onto a generated image (free tier). */
async function applyWatermark(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(bitmap, 0, 0);

  const pad = Math.round(bitmap.width * 0.03);
  const fontSize = Math.max(18, Math.round(bitmap.width * 0.045));
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = "bottom";
  const label = "Swift AI";
  const textWidth = ctx.measureText(label).width;

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#12072B";
  ctx.fillRect(
    canvas.width - textWidth - pad * 2.4,
    canvas.height - fontSize - pad * 1.8,
    textWidth + pad * 1.6,
    fontSize + pad * 0.9,
  );
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#00F0FF";
  ctx.fillText(label, canvas.width - textWidth - pad * 1.6, canvas.height - pad);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? blob), "image/png"),
  );
}

function b64ToBlob(b64: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: "image/png" });
}

export interface GeneratedImage {
  path: string;
  url: string;
}

/** Generates an image, watermarks it when required and stores it in cloud backup. */
export async function generateImage(prompt: string, watermark: boolean): Promise<GeneratedImage> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Swift AI is busy — please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(detail || "Image generation failed");
  }
  const { b64 } = (await res.json()) as { b64: string };
  let blob = b64ToBlob(b64);
  if (watermark) blob = await applyWatermark(blob);

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const path = `${uid}/ai/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("swifty-media")
    .upload(path, blob, { contentType: "image/png", upsert: false });
  if (error) throw error;
  const url = (await signedUrl(path)) ?? URL.createObjectURL(blob);
  return { path, url };
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("swifty-media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function downloadMedia(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function shareMedia(url: string, text: string) {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (nav.share) {
    await nav.share({ title: "Swift AI", text, url });
    return;
  }
  await navigator.clipboard.writeText(url);
}
