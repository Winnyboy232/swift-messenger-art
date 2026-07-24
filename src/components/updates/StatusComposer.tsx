import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, Type, Video as VideoIcon, Image as ImageIcon, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ComposerMode = "camera" | "photo" | "video" | "text";

const TEXT_BG_PRESETS = [
  "linear-gradient(135deg, #00F0FF, #6A0DAD)",
  "linear-gradient(135deg, #6A0DAD, #12072B)",
  "linear-gradient(135deg, #00F0FF, #12072B)",
  "linear-gradient(135deg, #ff5f6d, #ffc371)",
  "linear-gradient(135deg, #11998e, #38ef7d)",
  "linear-gradient(135deg, #fc466b, #3f5efb)",
  "#12072B",
  "#0f172a",
];

interface StatusComposerProps {
  mode: ComposerMode;
  userId: string;
  onClose: () => void;
  onPosted: () => void;
}

export function StatusComposer({ mode, userId, onClose, onPosted }: StatusComposerProps) {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File modes
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  // Text mode
  const [textContent, setTextContent] = useState("");
  const [bgIndex, setBgIndex] = useState(0);

  // Camera mode
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [cameraReady, setCameraReady] = useState(false);

  // Auto-open picker for photo/video
  useEffect(() => {
    if (mode === "photo" || mode === "video") {
      fileInputRef.current?.click();
    }
  }, [mode]);

  // Start camera stream
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Camera unavailable");
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [mode, cameraFacing, onClose]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      onClose();
      return;
    }
    setFile(f);
  };

  const captureFromCamera = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
    if (!blob) return;
    const captured = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    setFile(captured);
  };

  const uploadAndInsert = async (payload: {
    type: "image" | "video" | "text";
    fileToUpload?: File;
    text_content?: string;
    background_color?: string;
  }) => {
    setBusy(true);
    try {
      let media_url: string | null = null;
      if (payload.fileToUpload) {
        const ext = payload.fileToUpload.name.split(".").pop() || "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("status-media")
          .upload(path, payload.fileToUpload, {
            contentType: payload.fileToUpload.type,
            upsert: false,
          });
        if (upErr) throw upErr;
        media_url = path;
      }
      const { error } = await supabase.from("updates").insert({
        user_id: userId,
        type: payload.type,
        media_url,
        text_content: payload.text_content ?? (caption.trim() || null),
        background_color: payload.background_color ?? null,
      });
      if (error) throw error;
      toast.success("Status posted");
      onPosted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const handleSendMedia = async () => {
    if (!file) return;
    const type = file.type.startsWith("video/") ? "video" : "image";
    await uploadAndInsert({ type, fileToUpload: file });
  };

  const handleSendText = async () => {
    if (!textContent.trim()) return;
    await uploadAndInsert({
      type: "text",
      text_content: textContent.trim(),
      background_color: TEXT_BG_PRESETS[bgIndex],
    });
  };

  const acceptAttr = mode === "video" ? "video/*" : "image/*";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      {/* Hidden file input */}
      {(mode === "photo" || mode === "video") && (
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={onFileChange}
        />
      )}

      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
          {mode === "text" ? "Text status" : mode === "camera" ? "Camera" : mode === "video" ? "Video" : "Photo"}
        </p>
        <div className="h-10 w-10" />
      </header>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {mode === "camera" && !file && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: cameraFacing === "user" ? "scaleX(-1)" : undefined }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin opacity-70" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setCameraFacing((f) => (f === "user" ? "environment" : "user"))}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
              aria-label="Flip camera"
            >
              <RotateCw size={18} />
            </button>
          </>
        )}

        {(mode === "photo" || mode === "video" || (mode === "camera" && file)) && previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} controls playsInline className="max-h-full max-w-full" />
            ) : (
              <img src={previewUrl} alt="preview" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        )}

        {mode === "text" && (
          <div
            className="absolute inset-0 flex items-center justify-center p-6"
            style={{ background: TEXT_BG_PRESETS[bgIndex] }}
          >
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type a status..."
              autoFocus
              className="w-full resize-none bg-transparent text-center text-2xl font-semibold text-white outline-none placeholder:text-white/60"
              rows={6}
            />
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div
        className="bg-black/70 px-4 pt-3 pb-4 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {mode === "text" ? (
          <>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {TEXT_BG_PRESETS.map((bg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBgIndex(i)}
                  aria-label={`Background ${i + 1}`}
                  className={`h-9 w-9 shrink-0 rounded-full border-2 transition ${
                    bgIndex === i ? "border-white" : "border-white/20"
                  }`}
                  style={{ background: bg }}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={busy || !textContent.trim()}
              onClick={handleSendText}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Type size={16} />}
              Share text status
            </button>
          </>
        ) : mode === "camera" && !file ? (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={captureFromCamera}
              aria-label="Capture"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/70 backdrop-blur transition active:scale-95"
            >
              <Camera size={26} />
            </button>
          </div>
        ) : file ? (
          <div className="space-y-3">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm font-medium"
              >
                Retake
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSendMedia}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : file.type.startsWith("video/") ? (
                  <VideoIcon size={16} />
                ) : (
                  <ImageIcon size={16} />
                )}
                Share
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs opacity-70">Select a file to continue</p>
        )}
      </div>
    </div>
  );
}
