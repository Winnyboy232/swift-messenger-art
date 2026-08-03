import { useState } from "react";
import { X, TicketCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onRedeemed: () => void;
}

interface RedeemResult {
  ok: boolean;
  error?: string;
  tier?: string;
  expires_at?: string;
}

/** Redeem a 12-character Swift Premium gift code. */
export function RedeemCode({ open, onClose, onRedeemed }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const redeem = async () => {
    const value = code.trim().toUpperCase();
    if (value.length < 6) {
      toast.error("Enter the full code, e.g. SWIFT-PRO-89AB");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("redeem_gift_code" as never, {
        _code: value,
      } as never);
      if (error) throw error;
      const result = (data ?? {}) as unknown as RedeemResult;
      if (!result.ok) {
        toast.error(result.error || "This code could not be redeemed");
        return;
      }
      toast.success(`Premium unlocked — ${result.tier} plan active`);
      setCode("");
      onRedeemed();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not redeem code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <TicketCheck size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Redeem Premium Code</h2>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Enter the gift code you received to activate Swift Premium instantly.
        </p>
        <input
          value={code}
          autoFocus
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SWIFT-PRO-89AB"
          className="mt-4 h-14 w-full rounded-2xl border border-border bg-card px-4 text-center text-lg font-bold tracking-widest text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void redeem()}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-brand)" }}
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Redeem code
        </button>
      </div>
    </div>
  );
}
