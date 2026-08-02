import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/swifty-logo.png";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  /** Compact mode is used inside the in-chat quick-AI overlay. */
  compact?: boolean;
}

export function SwiftAIChat({ compact = false }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const next: AiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
    } catch (e) {
      setMessages(next);
      toast.error(e instanceof Error ? e.message : "Swift AI failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex-1 overflow-y-auto px-4 ${compact ? "py-3" : "py-4"} space-y-3`}>
        {messages.length === 0 && (
          <div className="mt-6 flex flex-col items-center text-center">
            <img src={logo} alt="Swift AI" width={56} height={56} className="h-14 w-14" />
            <p className="mt-3 text-sm font-bold text-foreground">Ask Swift AI anything</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Free unlimited text chat for every Swift plan.
            </p>
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
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4">
          <Sparkles size={14} className="text-primary" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Message Swift AI..."
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
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
