import { useState } from "react";
import { X, Gift, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TIER_PLANS, type Tier } from "@/lib/tiers";
import { payWithPaystack, getPaystackKey } from "@/lib/paystack";
import { TierBadge } from "@/components/TierBadge";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | null;
  userId: string | null;
  isAdmin: boolean;
}

const GIFTABLE = TIER_PLANS.filter((p) => p.id !== "free");

/** Buy a premium plan for someone else and receive a redeemable code. */
export function GiftPremium({ open, onClose, email, userId, isAdmin }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [months, setMonths] = useState(1);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const generate = async (tier: Tier) => {
    const { data, error } = await supabase.rpc("generate_gift_code" as never, {
      _plan_tier: tier,
      _duration_months: months,
    } as never);
    if (error) throw error;
    return data as unknown as string;
  };

  const buyGift = async (tier: Tier, amountKobo: number) => {
    if (!userId) return;
    setBusy(tier);
    try {
      if (!isAdmin) {
        if (!getPaystackKey()) {
          toast.error("Payments are not configured");
          return;
        }
        const reference = await payWithPaystack({
          email: email ?? `${userId}@swift.app`,
          amountKobo: amountKobo * months,
          metadata: { user_id: userId, tier, months, purpose: "gift" },
        });
        if (!reference) return;
      }
      const generated = await generate(tier);
      setCode(generated);
      toast.success("Gift code created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create gift code");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Gift Swift Premium</h2>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-4">
        {code ? (
          <div className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Share this code with your friend</p>
            <p className="mt-3 text-xl font-extrabold tracking-widest text-foreground">{code}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(code);
                setCopied(true);
                toast.success("Code copied");
              }}
              className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-primary-foreground"
              style={{ background: "var(--gradient-brand)" }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCode(null);
                setCopied(false);
              }}
              className="mt-3 text-xs font-semibold text-muted-foreground underline"
            >
              Gift another plan
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Duration</p>
              <div className="flex gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className="flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition"
                    style={
                      months === m
                        ? { background: "var(--gradient-brand)", borderColor: "transparent", color: "var(--primary-foreground)" }
                        : { borderColor: "var(--border)", color: "var(--foreground)" }
                    }
                  >
                    {m} mo
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pb-10">
              {GIFTABLE.map((plan) => (
                <div key={plan.id} className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                    <TierBadge tier={plan.id} size={15} />
                  </div>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    ₦{((plan.priceKobo * months) / 100).toLocaleString()}
                    <span className="text-xs font-medium text-muted-foreground"> · {months} month{months > 1 ? "s" : ""}</span>
                  </p>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void buyGift(plan.id, plan.priceKobo)}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {busy === plan.id && <Loader2 size={15} className="animate-spin" />}
                    {isAdmin ? "Generate code (owner)" : "Buy gift code"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
