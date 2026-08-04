import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Send, Loader2, Pause, Play, Lock, ChevronUp, ChevronLeft } from "lucide-react";
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

const CANCEL_DISTANCE = 90;
const LOCK_DISTANCE = 70;

/** WhatsApp-style recorder: hold to record, slide left to cancel, slide up to lock. */
export function VoiceRecorder({ disabled, onSend }: Props) {
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const cancelRef = useRef(false);
  const lockedRef = useRef(false);
  const startedAtRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef(0);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const tickWave = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
    setLevels((prev) => [...prev.slice(-39), Math.max(0.06, peak)]);
    rafRef.current = requestAnimationFrame(tickWave);
  };

  const start = async () => {
    if (recording || sending || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      cancelRef.current = false;
      lockedRef.current = false;
      pausedMsRef.current = 0;

      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const duration = (Date.now() - startedAtRef.current - pausedMsRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: mime });
        cleanup();
        setRecording(false);
        setLocked(false);
        setPaused(false);
        setLevels([]);
        setDragX(0);
        setDragY(0);
        if (cancelRef.current || blob.size === 0 || duration < 0.4) {
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

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setElapsed(0);
      setLevels([]);
      timerRef.current = window.setInterval(() => {
        if (!pauseStartRef.current) {
          setElapsed((Date.now() - startedAtRef.current - pausedMsRef.current) / 1000);
        }
      }, 100);
      rafRef.current = requestAnimationFrame(tickWave);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Microphone access denied");
      cleanup();
    }
  };

  const stop = (cancelled: boolean) => {
    if (!recorderRef.current || !recording) return;
    cancelRef.current = cancelled;
    if (recorderRef.current.state === "paused") recorderRef.current.resume();
    recorderRef.current.stop();
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      pauseStartRef.current = Date.now();
      setPaused(true);
    } else if (rec.state === "paused") {
      rec.resume();
      pausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
      setPaused(false);
    }
  };

  // ---- gesture handlers on the mic button ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    originRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    void start();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!recording || lockedRef.current || !originRef.current) return;
    const dx = Math.min(0, e.clientX - originRef.current.x);
    const dy = Math.min(0, e.clientY - originRef.current.y);
    setDragX(dx);
    setDragY(dy);
    if (-dy > LOCK_DISTANCE) {
      lockedRef.current = true;
      setLocked(true);
      setDragX(0);
      setDragY(0);
      return;
    }
    if (-dx > CANCEL_DISTANCE) stop(true);
  };

  const onPointerUp = () => {
    originRef.current = null;
    if (!recording || lockedRef.current) return;
    stop(-dragX > CANCEL_DISTANCE);
  };

  if (sending) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (recording && locked) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
        <button
          type="button"
          aria-label="Delete recording"
          onClick={() => stop(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/15"
        >
          <Trash2 size={16} />
        </button>
        <Waveform levels={levels} />
        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
          {formatTime(elapsed)}
        </span>
        <button
          type="button"
          aria-label={paused ? "Resume recording" : "Pause recording"}
          onClick={togglePause}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-primary"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button
          type="button"
          aria-label="Send recording"
          onClick={() => stop(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground transition active:scale-95"
          style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
        >
          <Send size={16} />
        </button>
      </div>
    );
  }

  if (recording) {
    const cancelProgress = Math.min(1, -dragX / CANCEL_DISTANCE);
    return (
      <div className="relative flex flex-1 items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatTime(elapsed)}
        </span>
        <span
          className="flex flex-1 items-center justify-center gap-1 text-xs text-muted-foreground"
          style={{ opacity: 1 - cancelProgress * 0.6, transform: `translateX(${dragX / 3}px)` }}
        >
          <ChevronLeft size={13} /> Slide to cancel
        </span>
        <span className="flex flex-col items-center text-[10px] text-primary">
          <ChevronUp size={13} className="animate-bounce" />
          <Lock size={11} />
        </span>
        <div
          className="pointer-events-none absolute -top-14 right-1 flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground"
          style={{
            background: "var(--gradient-brand)",
            transform: `translate(${dragX}px, ${dragY}px)`,
          }}
        >
          <Mic size={18} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Hold to record voice message"
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95 disabled:opacity-60"
    >
      <Mic size={18} />
    </button>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  const bars = levels.length ? levels : Array.from({ length: 24 }, () => 0.1);
  return (
    <div className="flex h-6 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
      {bars.slice(-32).map((l, i) => (
        <span
          key={i}
          className="w-[3px] shrink-0 rounded-full"
          style={{ height: `${Math.max(10, l * 100)}%`, background: "var(--gradient-brand)" }}
        />
      ))}
    </div>
  );
}
