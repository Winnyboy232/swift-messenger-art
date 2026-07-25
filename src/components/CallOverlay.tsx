import { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from "lucide-react";

type Props = {
  kind: "audio" | "video";
  name: string;
  initials: string;
  onClose: () => void;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function CallOverlay({ kind, name, initials, onClose }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(kind === "video");
  const [speaker, setSpeaker] = useState(kind === "video");

  useEffect(() => {
    const t = window.setTimeout(() => setConnected(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [connected]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col text-primary-foreground"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--swift-purple) 55%, transparent), transparent 60%), linear-gradient(180deg, oklch(0.14 0.03 275), oklch(0.09 0.02 275))",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/60">
          {kind === "video" ? "Video call" : "Voice call"}
        </p>
        <div
          className="flex h-36 w-36 items-center justify-center rounded-full text-4xl font-semibold"
          style={{
            background: "var(--gradient-brand)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          {initials}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{name}</h2>
          <p className="mt-1 text-sm text-primary-foreground/70">
            {connected ? fmt(elapsed) : "Ringing…"}
          </p>
        </div>
        {kind === "video" && videoOn && (
          <div className="mt-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-[10px] text-primary-foreground/60 flex items-end justify-center p-2">
            You
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-6 pb-8">
        <CallButton active={!muted} onClick={() => setMuted((m) => !m)} label={muted ? "Unmute" : "Mute"}>
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </CallButton>
        {kind === "video" && (
          <CallButton active={videoOn} onClick={() => setVideoOn((v) => !v)} label="Camera">
            {videoOn ? <Video size={22} /> : <VideoOff size={22} />}
          </CallButton>
        )}
        <CallButton active={speaker} onClick={() => setSpeaker((s) => !s)} label="Speaker">
          <Volume2 size={22} />
        </CallButton>
        <button
          type="button"
          onClick={onClose}
          aria-label="End call"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition active:scale-95"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}

function CallButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/10 backdrop-blur transition active:scale-95 ${
        active ? "bg-white/15 text-primary-foreground" : "bg-white/5 text-primary-foreground/60"
      }`}
    >
      {children}
    </button>
  );
}
