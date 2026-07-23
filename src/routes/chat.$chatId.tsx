import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Paperclip, Send, Loader2, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";

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

function ChatScreen() {
  const { chatId } = Route.useParams();
  const { name = "Chat", initials = "?" } = Route.useSearch();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      await sendMessage({ media_url: path, media_type: mediaType });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  const handleVoice = async (blob: Blob, mime: string, _durationSec: number) => {
    if (!userId) return;
    try {
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const path = `${userId}/${chatId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("swifty-media")
        .upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      await sendMessage({
        media_url: path,
        media_type: "audio",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice upload failed");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">Online</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="mx-auto mt-16 max-w-[240px] text-center text-sm text-muted-foreground">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      <form
        onSubmit={handleSendText}
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur-xl"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          aria-label="Attach media"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>
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
          placeholder="Message"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {text.trim() ? (
          <button
            type="submit"
            aria-label="Send"
            disabled={sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground transition active:scale-95 disabled:opacity-50"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            <Send size={18} />
          </button>
        ) : (
          <VoiceRecorder onSend={handleVoice} />
        )}
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const mine = msg.sender === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] overflow-hidden rounded-2xl px-3 py-2 text-[15px] leading-snug ${
          mine ? "text-primary-foreground" : "bg-card text-foreground"
        }`}
        style={mine ? { background: "var(--gradient-brand)" } : undefined}
      >
        {msg.media_url && msg.media_type === "audio" ? (
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
        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
        <p className={`mt-0.5 text-right text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
