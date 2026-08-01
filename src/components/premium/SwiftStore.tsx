import { useState } from "react";
import { X, Loader2, Coins, Sticker, Palette, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STORE_CREDITS, STORE_ITEMS, type StoreItem } from "@/lib/tiers";
import { getPaystackKey, payWithPaystack } from "@/lib/paystack";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | null;
  userId: string | null;
  credits: number;
  onPurchased: () => void;
}

export function SwiftStore({ open, onClose, email, userId, credits, onPurchased }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!open) return null;

  const buy = async (item: StoreItem) => {
    if (!userId) return;
    if (!getPaystackKey()) {
      toast.error("Add VITE_PAYSTACK_PUBLIC_KEY to enable payments");
      return;
    }
    setBusy(item.id);
    try {
      const metadata = {
        user_id: userId,
        item_id: item.id,
        item_type: item.type,
        credits: item.credits ?? 0,
        purpose: "store",
      };
      const reference = await payWithPaystack({
        email: email ?? `${userId}@swift.app`,
        amountKobo: item.amountKobo,
        metadata,
      });
      if (!reference) return;

      await supabase.from("purchases").insert({
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        amount_kobo: item.amountKobo,
        reference,
        metadata,
      });

      if (item.type === "credits" && item.credits) {
        await supabase
          .from("profiles")
          .update({ ai_credits: credits + item.credits })
          .eq("id", userId);
        toast.success(`${item.credits} AI credits added`);
      } else {
        await supabase
          .from("unlocked_items")
          .upsert(
            { user_id: userId, item_id: item.id, item_type: item.type },
            { onConflict: "user_id,item_id" },
          );
        toast.success(`${item.name} unlocked`);
      }
      onPurchased();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ item, icon: Icon }: { item: StoreItem; icon: typeof Coins }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
      >
        <Icon size={17} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
      </div>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void buy(item)}
        className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-brand)" }}
      >
        {busy === item.id && <Loader2 size={12} className="animate-spin" />}
        {item.price}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Swift Store</h2>
        </div>
        <span className="ml-auto rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
          {credits} credits
        </span>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-10">
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Credit Packs</h3>
          {STORE_CREDITS.map((item) => (
            <Row key={item.id} item={item} icon={Coins} />
          ))}
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customisation</h3>
          {STORE_ITEMS.map((item) => (
            <Row key={item.id} item={item} icon={item.type === "theme" ? Palette : Sticker} />
          ))}
        </section>
      </div>
    </div>
  );
}
