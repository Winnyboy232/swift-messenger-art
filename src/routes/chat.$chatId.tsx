import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Image as ImageIcon,
  Phone,
  Video as VideoIcon,
  MoreVertical,
  Lock,
  Check,
  CheckCheck,
  Smile,
  Camera,
  Download,
  FileText,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { CallOverlay } from "@/components/CallOverlay";

const searchSchema = z.object({
  name: z.string().optional(),
  initials: z.string().optional(),
});

export const Route = createFileRoute("/chat/$chatId")({
  ssr: false,
  validateSearch: searchSchema,
  component: ChatScreen,
});

type Message = {
  id: string;
  user_id: string;
  chat_id: string;
  sender: "me" | "them";
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

type DisplayMessage = Message & { signedMediaUrl?: string };

const QUICK_EMOJIS = ["❤️", "🔥", "👍", "😂", "😮", "💜"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatScreen() {
  const { chatId } = Route.useParams();
  const { name = "Chat", initials = "?" } = Route.useSearch();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [call, setCall] = useState<null | "audio" | "video">(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setUserId(data.user.id);
    });
  }, [navigate]);

  const signMedia = async (msg: Message): Promise<DisplayMessage> => {
    if (!msg.media_url) return msg;
    const { data } = await supabase.storage.from("swifty-media").createSignedUrl(msg.media_url, 3600);
    return { ...msg, signedMediaUrl: data?.signedUrl };
  };

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error(error.message);
        return;
      }
      const signed = await Promise.all((data as Message[]).map(signMedia));
      if (mounted) setMessages(signed);
    })();

    const channel = supabase
      .channel(`messages:${userId}:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const msg = payload.new as Message;
          if (msg.user_id !== userId) return;
          const signed = await signMedia(msg);
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, signed]));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, chatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (payload: { content?: string; media_url?: string; media_type?: string }) => {
    if (!userId) return;
    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      chat_id: chatId,
      sender: "me",
      content: payload.content ?? null,
      media_url: payload.media_url ?? null,
      media_type: payload.media_type ?? null,
    });
    if (error) toast.error(error.message);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    await sendMessage({ content: trimmed });
    setSending(false);
  };

  const appendEmoji = (emoji: string) => {
    setText((t) => t + emoji);
    setShowEmoji(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${chatId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("swifty-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const mediaType = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("image/")
          ? "image"
          : "file";
      await sendMessage({
        media_url: path,
        media_type: mediaType,
        content: mediaType === "file" ? `${file.name}|${file.size}` : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVoice = async (blob: Blob, mime: string) => {
    if (!userId) return;
    try {
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const path = `${userId}/${chatId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("swifty-media")
        .upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      await sendMessage({ media_url: path, media_type: "audio" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice upload failed");
    }
  };

  const toggleReaction = (id: string, emoji: string) => {
    setReactions((r) => ({ ...r, [id]: r[id] === emoji ? "" : emoji }));
  };

  const groupedByDay = useMemo(() => {
    const groups: { key: string; label: string; items: DisplayMessage[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    for (const m of messages) {
      const d = new Date(m.created_at);
      const key = dayKey(d);
      let label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (key === dayKey(today)) label = "Today";
      else if (key === dayKey(yesterday)) label = "Yesterday";
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(m);
      else groups.push({ key, label, items: [m] });
    }
    return groups;
  }, [messages]);

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="relative">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            {initials}
          </span>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background"
            style={{ background: "oklch(0.75 0.19 150)" }}
            aria-label="Online"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">Online</p>
        </div>
        <button
          type="button"
          onClick={() => setCall("audio")}
          aria-label="Audio call"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-card"
        >
          <Phone size={19} />
        </button>
        <button
          type="button"
          onClick={() => setCall("video")}
          aria-label="Video call"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-card"
        >
          <VideoIcon size={20} />
        </button>
        <button
          type="button"
          aria-label="Options"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-card"
        >
          <MoreVertical size={19} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        <EncryptionBanner name={name} />
        {groupedByDay.length === 0 && (
          <p className="mx-auto mt-16 max-w-[240px] text-center text-sm text-muted-foreground">
            No messages yet. Say hi 👋
          </p>
        )}
        {groupedByDay.map((g) => (
          <div key={g.key} className="space-y-2">
            <div className="flex justify-center py-1">
              <span className="rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.label}
              </span>
            </div>
            {g.items.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                reaction={reactions[m.id]}
                onReact={(emoji) => toggleReaction(m.id, emoji)}
              />
            ))}
          </div>
        ))}
      </div>

      {showEmoji && (
        <div className="sticky bottom-[76px] z-10 mx-3 mb-1 flex justify-around rounded-2xl border border-border bg-card px-3 py-2 shadow-lg">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => appendEmoji(e)}
              className="text-2xl transition active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSendText}
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur-xl"
      >
        <input ref={fileRef} type="file" accept="image/*,video/*,application/*" className="hidden" onChange={handleFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <button
          type="button"
          aria-label="Attach"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
        </button>
        <div className="flex min-h-11 flex-1 items-end gap-1 rounded-full border border-border bg-card pl-4 pr-1.5 py-1">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText(e as unknown as React.FormEvent);
              }
            }}
            placeholder={`Message ${name}...`}
            className="max-h-32 min-h-[28px] flex-1 resize-none self-center bg-transparent text-[15px] leading-tight text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
          >
            <Smile size={20} />
          </button>
          <button
            type="button"
            aria-label="Camera"
            onClick={() => cameraRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
          >
            <Camera size={20} />
          </button>
        </div>
        {text.trim() ? (
          <button
            type="submit"
            aria-label="Send"
            disabled={sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground transition active:scale-95 disabled:opacity-50"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            <Check size={20} />
          </button>
        ) : (
          <VoiceRecorder onSend={handleVoice} />
        )}
      </form>

      {call && <CallOverlay kind={call} name={name} initials={initials} onClose={() => setCall(null)} />}
    </div>
  );
}

function EncryptionBanner({ name }: { name: string }) {
  return (
    <div className="mx-auto flex max-w-[92%] items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary-foreground"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Lock size={13} />
      </span>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Messages and calls are end-to-end encrypted. Only you and{" "}
        <span className="font-medium text-foreground">{name}</span> can read or listen to them.{" "}
        <button type="button" className="font-medium text-primary underline-offset-2 hover:underline">
          Learn more
        </button>
      </p>
    </div>
  );
}

function MessageBubble({
  msg,
  reaction,
  onReact,
}: {
  msg: DisplayMessage;
  reaction?: string;
  onReact: (emoji: string) => void;
}) {
  const mine = msg.sender === "me";
  const [showPicker, setShowPicker] = useState(false);
  const isFile = msg.media_type === "file";
  const filename = isFile && msg.content ? msg.content.split("|")[0] : null;
  const filesize = isFile && msg.content ? Number(msg.content.split("|")[1] || 0) : 0;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[80%]">
        <button
          type="button"
          onDoubleClick={() => onReact("❤️")}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowPicker((v) => !v);
          }}
          className={`block w-full overflow-hidden rounded-2xl px-3 py-2 text-left text-[15px] leading-snug ${
            mine ? "text-primary-foreground" : "text-foreground"
          }`}
          style={{
            background: mine
              ? "linear-gradient(135deg, oklch(0.48 0.22 300), oklch(0.42 0.22 295))"
              : "oklch(0.22 0.03 275)",
            borderBottomRightRadius: mine ? "6px" : undefined,
            borderBottomLeftRadius: !mine ? "6px" : undefined,
          }}
        >
          {isFile && msg.signedMediaUrl ? (
            <a
              href={msg.signedMediaUrl}
              download={filename ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={`mb-1 flex items-center gap-3 rounded-xl p-2 ${mine ? "bg-white/15" : "bg-white/5"}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  mine ? "bg-white/20 text-primary-foreground" : "bg-primary/20 text-primary"
                }`}
              >
                <FileText size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{filename ?? "File"}</span>
                <span className={`block text-[11px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                  {(filesize / 1024).toFixed(1)} KB
                </span>
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  mine ? "bg-white/20" : "bg-primary/15 text-primary"
                }`}
              >
                <Download size={16} />
              </span>
            </a>
          ) : msg.media_url && msg.media_type === "audio" ? (
            msg.signedMediaUrl ? (
              <AudioPlayer src={msg.signedMediaUrl} mine={mine} />
            ) : (
              <div className="flex h-10 w-56 items-center justify-center rounded-xl bg-black/20">
                <Loader2 size={16} className="animate-spin opacity-70" />
              </div>
            )
          ) : msg.media_url ? (
            <div className="mb-1 overflow-hidden rounded-xl">
              {msg.signedMediaUrl ? (
                msg.media_type === "video" ? (
                  <video src={msg.signedMediaUrl} controls className="max-h-72 w-full" />
                ) : (
                  <img src={msg.signedMediaUrl} alt="attachment" className="max-h-72 w-full object-cover" />
                )
              ) : (
                <div className="flex h-32 w-56 items-center justify-center bg-black/20">
                  <ImageIcon size={20} className="opacity-60" />
                </div>
              )}
            </div>
          ) : null}
          {msg.content && !isFile && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
              mine ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            <span>{formatTime(msg.created_at)}</span>
            {mine && <CheckCheck size={13} className="text-sky-300" />}
          </div>
        </button>

        {reaction && (
          <span
            className={`absolute -bottom-2 ${mine ? "right-3" : "left-3"} rounded-full border border-border bg-background px-1.5 py-0.5 text-xs shadow-sm`}
          >
            {reaction}
          </span>
        )}

        {showPicker && (
          <div
            className={`absolute -top-10 ${mine ? "right-0" : "left-0"} flex gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg`}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(e);
                  setShowPicker(false);
                }}
                className="text-lg transition active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Silence unused import lint in some setups
void Check;
