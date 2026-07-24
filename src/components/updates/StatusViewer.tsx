import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ViewerUpdate = {
  id: string;
  user_id: string;
  type: "image" | "video" | "text";
  media_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
};

interface StatusViewerProps {
  updates: ViewerUpdate[];
  authorName: string;
  authorInitials: string;
  currentUserId: string;
  onClose: () => void;
  onOpenViewers?: (updateId: string) => void;
}

const IMAGE_DURATION_MS = 5000;

export function StatusViewer({
  updates,
  authorName,
  authorInitials,
  currentUserId,
  onClose,
  onOpenViewers,
}: StatusViewerProps) {
  const [idx, setIdx] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const durationRef = useRef<number>(IMAGE_DURATION_MS);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = updates[idx];
  const isOwn = current?.user_id === currentUserId;

  // Load signed URL for media
  useEffect(() => {
    setSignedUrl(null);
    setProgress(0);
    elapsedRef.current = 0;
    if (!current) return;
    if (current.type === "text" || !current.media_url) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("status-media")
        .createSignedUrl(current.media_url!, 3600);
      if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [current]);

  // Log a view (skip own)
  useEffect(() => {
    if (!current || isOwn) return;
    supabase
      .from("update_views")
      .insert({ update_id: current.id, viewer_id: currentUserId })
      // ignore duplicate errors (unique constraint)
      .then(() => {});
  }, [current, isOwn, currentUserId]);

  const advance = () => {
    if (idx < updates.length - 1) {
      setIdx((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    if (idx > 0) setIdx((i) => i - 1);
  };

  // Progress animation
  useEffect(() => {
    if (!current) return;
    if (current.type === "video") {
      // driven by video timeupdate
      return;
    }
    durationRef.current = IMAGE_DURATION_MS;
    startTsRef.current = performance.now() - elapsedRef.current;

    const tick = () => {
      if (paused) return;
      const now = performance.now();
      const elapsed = now - startTsRef.current;
      elapsedRef.current = elapsed;
      const p = Math.min(1, elapsed / durationRef.current);
      setProgress(p);
      if (p >= 1) {
        advance();
        return;
      }
      timerRef.current = window.requestAnimationFrame(tick);
    };
    timerRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused]);

  // Video progress
  const onVideoTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };
  const onVideoEnd = () => advance();

  if (!current) return null;

  const bg =
    current.type === "text"
      ? current.background_color ?? "var(--gradient-brand)"
      : "#000";

  const hoursAgo = Math.floor((Date.now() - new Date(current.created_at).getTime()) / 3600000);
  const minsAgo = Math.floor((Date.now() - new Date(current.created_at).getTime()) / 60000);
  const timeLabel = hoursAgo > 0 ? `${hoursAgo}h ago` : `${Math.max(1, minsAgo)}m ago`;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col text-white" style={{ background: bg }}>
      {/* Progress bars */}
      <div
        className="flex gap-1 px-3 pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        {updates.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white transition-[width]"
              style={{
                width: i < idx ? "100%" : i === idx ? `${progress * 100}%` : "0%",
                transitionDuration: i === idx ? "80ms" : "0ms",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "var(--gradient-brand)" }}
        >
          {authorInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{authorName}</p>
          <p className="text-[11px] opacity-70">{timeLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Media */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {current.type === "image" && signedUrl && (
          <img src={signedUrl} alt="status" className="max-h-full max-w-full object-contain" />
        )}
        {current.type === "video" && signedUrl && (
          <video
            ref={videoRef}
            src={signedUrl}
            autoPlay
            playsInline
            onTimeUpdate={onVideoTime}
            onEnded={onVideoEnd}
            className="max-h-full max-w-full"
          />
        )}
        {current.type === "text" && (
          <div className="px-8 text-center">
            <p className="text-3xl font-semibold leading-snug">{current.text_content}</p>
          </div>
        )}

        {/* Tap zones */}
        <button
          type="button"
          onClick={goBack}
          aria-label="Previous"
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          onClick={advance}
          aria-label="Next"
          className="absolute inset-y-0 right-0 w-1/3"
        />

        {/* Side chevrons desktop-friendly */}
        <ChevronLeft className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-30" size={22} />
        <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-30" size={22} />

        {current.text_content && current.type !== "text" && (
          <p className="absolute bottom-6 left-4 right-4 text-center text-sm">
            {current.text_content}
          </p>
        )}
      </div>

      {/* Footer for owner */}
      {isOwn && onOpenViewers && (
        <div
          className="flex items-center justify-center px-4 pt-2 pb-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <button
            type="button"
            onClick={() => onOpenViewers(current.id)}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium"
          >
            <Eye size={14} />
            View viewers
          </button>
        </div>
      )}
    </div>
  );
}
