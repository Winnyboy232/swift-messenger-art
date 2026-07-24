import { useEffect, useState } from "react";
import { Image as ImageIcon, Play, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatusThumbnailProps {
  type: "image" | "video" | "text";
  media_url: string | null;
  text_content?: string | null;
  background_color?: string | null;
}

export function StatusThumbnail({ type, media_url, text_content, background_color }: StatusThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!media_url || type === "text") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("status-media").createSignedUrl(media_url, 3600);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [media_url, type]);

  if (type === "text") {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border p-1 text-[9px] font-semibold leading-tight text-white"
        style={{ background: background_color ?? "var(--gradient-brand)" }}
      >
        <span className="line-clamp-2 text-center">{text_content ?? <Type size={14} />}</span>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
        {url ? (
          <video src={url} muted playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play size={14} className="opacity-60" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Play size={14} className="text-white" fill="white" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      {url ? (
        <img src={url} alt="preview" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon size={14} className="opacity-60" />
        </div>
      )}
    </div>
  );
}
