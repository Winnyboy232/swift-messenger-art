import { useState } from "react";
import { X, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TIER_PLANS, type Tier } from "@/lib/tiers";
import { getPaystackKey, payWithPaystack } from "@/lib/paystack";
import { TierBadge } from "@/components/TierBadge";

interface Props {
  open: boolean;
  onClose: () => void;
  currentTier: Tier;
  email: string | null;
  userId: string | null;
  isAdmin: boolean;
  onUpgraded: () => void;
}

export function PremiumPlans({ open, onClose, currentTier, email, userId, isAdmin, onUpgraded }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!open) return null;

  const subscribe = async (tier: Tier, planCode?: string) => {
    if (!userId) return;
    if (isAdmin) {
      toast.info("Owner account already has lifetime Ultimate access");
      return;
    }
    if (!planCode) return;
    if (!getPaystackKey()) {
      toast.error("Add VITE_PAYSTACK_PUBLIC_KEY to enable payments");
      return;
    }
    setBusy(tier);
    try {
      const reference = await payWithPaystack({
        email: email ?? `${userId}@swift.app`,
        planCode,
        metadata: { user_id: userId, tier, purpose: "subscription" },
      });
      if (!reference) return;
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: tier, is_frozen: false, frozen_at: null, is_suspended: false })
        .eq("id", userId);
      if (error) throw error;
      toast.success(`Welcome to Swift ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
      onUpgraded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
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
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Swift Premium &amp; Plans</h2>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-4">
        {isAdmin && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Owner account — lifetime free Ultimate access is active.
          </div>
        )}
        <div className="space-y-4 pb-10">
          {TIER_PLANS.map((plan) => {
            const active = currentTier === plan.id;
            return (
              <div
                key={plan.id}
                className="relative rounded-3xl border p-4"
                style={{
                  borderColor: plan.popular
                    ? "color-mix(in oklab, var(--swift-purple) 60%, transparent)"
                    : "var(--border)",
                  background: plan.popular
                    ? "linear-gradient(160deg, color-mix(in oklab, var(--swift-purple) 18%, var(--card)) 0%, var(--card) 70%)"
                    : "var(--card)",
                }}
              >
                {plan.popular && (
                  <span
                    className="absolute -top-2 right-4 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    MOST POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                  <TierBadge tier={plan.id} size={15} />
                </div>
                <p className="mt-1 text-lg font-extrabold text-foreground">{plan.price}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check size={13} className="mt-0.5 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {plan.id !== "free" && (
                  <button
                    type="button"
                    disabled={active || busy !== null}
                    onClick={() => void subscribe(plan.id, plan.planCode)}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {busy === plan.id && <Loader2 size={15} className="animate-spin" />}
                    {active ? "Current plan" : `Subscribe · ${plan.price}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
