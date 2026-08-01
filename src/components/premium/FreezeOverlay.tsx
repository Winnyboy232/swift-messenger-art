import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  onAppealed: () => void;
}

export function FreezeOverlay({ userId, onAppealed }: Props) {
  const [modal, setModal] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("appeals")
      .insert({ user_id: userId, message: message.trim(), status: "pending" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setModal(false);
    setMessage("");
    toast.success("Appeal submitted. Your account unfreezes automatically in 48 hours.");
    onAppealed();
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-card p-3">
          <ShieldAlert size={18} className="shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">Account frozen by anti-spam</p>
            <p className="text-[11px] text-muted-foreground">
              Messaging and calls are paused. Appeal to restore access in 48 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal(true)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            Appeal Freeze
          </button>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold text-foreground">Appeal your freeze</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Send an apology and commitment to Swift's rules. Freezes lift automatically 48 hours after
              submission.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="I'm sorry for..."
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-10 flex-1 rounded-2xl border border-border text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !message.trim()}
                onClick={() => void submit()}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-brand)" }}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Submit appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
