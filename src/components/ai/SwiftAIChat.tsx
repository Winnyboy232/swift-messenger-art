import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { SwiftAIAvatar } from "@/components/ai/SwiftAIAvatar";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  /** Compact mode is used inside the in-chat quick-AI overlay. */
  compact?: boolean;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function SwiftAIChat({ compact = false }: Props) {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const tier = profile?.subscription_tier ?? "free";
  const memoryEnabled = profile?.is_admin || tier === "pro" || tier === "ultimate";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Restore persisted conversation history.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("ai_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled && data?.length) setMessages(data as AiMessage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (role: "user" | "assistant", content: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await supabase.from("ai_messages").insert({ user_id: uid, role, content });
  }, []);

  /** Pro & Ultimate: remember explicit "remember that ..." statements. */
  const captureMemory = useCallback(
    async (text: string) => {
      if (!memoryEnabled || !profile?.id) return;
      const match = /^remember(?: that)?[:,]?\s+(.{3,300})$/i.exec(text.trim());
      if (!match?.[1]) return;
      const value = match[1].trim();
      await supabase.from("ai_memory").upsert(
        { user_id: profile.id, memory_key: value.slice(0, 60).toLowerCase(), memory_value: value },
        { onConflict: "user_id,memory_key" },
      );
      toast.success("Swift AI will remember that");
    },
    [memoryEnabled, profile?.id],
  );

  const loadMemory = useCallback(async () => {
    if (!memoryEnabled) return "";
    const { data } = await supabase.from("ai_memory").select("memory_value").limit(40);
    if (!data?.length) return "";
    return data.map((m) => `- ${m.memory_value}`).join("\n");
  }, [memoryEnabled]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    const next: AiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    void persist("user", text);
    void captureMemory(text);
    try {
      const memory = await loadMemory();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, memory, tier }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        if (res.status === 429) throw new Error("Swift AI is busy — please retry shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
        throw new Error(detail || "Swift AI could not respond");
      }
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      void persist("assistant", acc);
      if (speak && typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(acc.replace(/[*_`#>]/g, ""));
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setMessages(next);
      toast.error(e instanceof Error ? e.message : "Swift AI failed");
    } finally {
      setStreaming(false);
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = getRecognition();
    if (!recognition) {
      toast.error("Voice input is not supported on this browser");
      return;
    }
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) void send(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Could not hear you — try again");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const clearHistory = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("ai_messages").delete().eq("user_id", userData.user.id);
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex-1 overflow-y-auto px-4 ${compact ? "py-3" : "py-4"} space-y-3`}>
        {messages.length === 0 && (
          <div className="mt-6 flex flex-col items-center text-center">
            <SwiftAIAvatar size={72} />
            <p className="mt-3 text-sm font-bold text-foreground">Ask Swift AI anything</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Free unlimited text chat for every Swift plan.
            </p>
            {memoryEnabled && (
              <p className="mt-1 text-[11px] text-primary">
                Long-term memory is on — say “remember that …”.
              </p>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm"
              style={
                m.role === "user"
                  ? { background: "var(--gradient-brand)", color: "var(--primary-foreground)" }
                  : { background: "var(--card)", color: "var(--foreground)" }
              }
            >
              {m.content || "…"}
            </div>
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.content === "" && (
          <Loader2 size={14} className="animate-spin text-primary" />
        )}
        {messages.length > 0 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => void clearHistory()}
              className="text-[11px] font-semibold text-muted-foreground underline"
            >
              Clear conversation
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <button
          type="button"
          aria-label={speak ? "Mute AI voice replies" : "Speak AI replies"}
          onClick={() => {
            setSpeak((s) => !s);
            if (typeof window !== "undefined") window.speechSynthesis?.cancel();
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-border ${speak ? "text-primary" : "text-muted-foreground"}`}
        >
          {speak ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4">
          <Sparkles size={14} className="text-primary" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder={listening ? "Listening..." : "Message Swift AI..."}
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          onClick={toggleVoice}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-border ${listening ? "text-destructive" : "text-primary"}`}
        >
          {listening ? <MicOff size={17} className="animate-pulse" /> : <Mic size={17} />}
        </button>
        <button
          type="button"
          aria-label="Send to Swift AI"
          disabled={streaming || !input.trim()}
          onClick={() => void send()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-brand)" }}
        >
          {streaming ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
    </div>
  );
}
