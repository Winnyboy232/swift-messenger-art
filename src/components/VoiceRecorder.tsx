import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  disabled?: boolean;
  onSend: (blob: Blob, mime: string, durationSec: number) => Promise<void> | void;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ disabled, onSend }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelRef = useRef(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    if (recording || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stopStream();
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: mime });
        setRecording(false);
        if (cancelRef.current || blob.size === 0) {
          setElapsed(0);
          return;
        }
        setSending(true);
        try {
          await onSend(blob, mime, duration);
        } finally {
          setSending(false);
          setElapsed(0);
        }
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Microphone access denied");
      stopStream();
    }
  };

  const cancel = () => {
    if (!recording) return;
    cancelRef.current = true;
    recorderRef.current?.stop();
  };

  const send = () => {
    if (!recording) return;
    cancelRef.current = false;
    recorderRef.current?.stop();
  };

  if (sending) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5">
        <button
          type="button"
          aria-label="Cancel recording"
          onClick={cancel}
          className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/20"
        >
          <Trash2 size={16} />
        </button>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
        <span className="flex-1 text-sm font-medium tabular-nums text-foreground">
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground">Recording…</span>
        <button
          type="button"
          aria-label="Send recording"
          onClick={send}
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground transition active:scale-95"
          style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
        >
          <Send size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Record voice message"
      disabled={disabled}
      onClick={start}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95 disabled:opacity-60"
    >
      <Mic size={18} />
    </button>
  );
}
