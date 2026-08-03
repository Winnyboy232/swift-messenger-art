import { useCallback, useEffect, useState } from "react";
import { X, ShieldCheck, Loader2, Snowflake, Gift, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TIER_LABEL, type Tier } from "@/lib/tiers";
import { TierBadge } from "@/components/TierBadge";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AdminRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  subscription_tier: string;
  is_admin: boolean;
  is_frozen: boolean;
  is_suspended: boolean;
  spam_reports_count: number;
  tier_expires_at: string | null;
}

const TIERS: Tier[] = ["free", "basic", "pro", "ultimate"];

/** Owner-only dashboard: subscriber overview, tier toggles, unfreeze & code generation. */
export function AdminPanel({ open, onClose }: Props) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [genTier, setGenTier] = useState<Tier>("pro");
  const [lastCode, setLastCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, phone, subscription_tier, is_admin, is_frozen, is_suspended, spam_reports_count, tier_expires_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as AdminRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const setTier = async (id: string, tier: Tier) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_set_tier" as never, {
      _target: id,
      _tier: tier,
    } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Tier set to ${TIER_LABEL[tier]}`);
    void load();
  };

  const unfreeze = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_unfreeze" as never, { _target: id } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account unfrozen");
    void load();
  };

  const generate = async () => {
    const { data, error } = await supabase.rpc("generate_gift_code" as never, {
      _plan_tier: genTier,
      _duration_months: 1,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLastCode(data as unknown as string);
    toast.success("Gift code generated");
  };

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.display_name ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").includes(q) ||
      r.subscription_tier.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Admin Dashboard</h2>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
            <Gift size={13} className="text-primary" /> Generate gift code
          </p>
          <div className="flex gap-2">
            {TIERS.filter((t) => t !== "free").map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setGenTier(t)}
                className="flex-1 rounded-xl border px-2 py-2 text-xs font-bold"
                style={
                  genTier === t
                    ? { background: "var(--gradient-brand)", borderColor: "transparent", color: "var(--primary-foreground)" }
                    : { borderColor: "var(--border)", color: "var(--foreground)" }
                }
              >
                {TIER_LABEL[t]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            className="mt-2 h-10 w-full rounded-xl text-xs font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            Generate code
          </button>
          {lastCode && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(lastCode);
                toast.success("Copied");
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-extrabold tracking-widest text-primary"
            >
              {lastCode}
              <Copy size={13} />
            </button>
          )}
        </div>

        <div className="mb-3 flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subscribers..."
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2 pb-10">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                    {r.display_name || r.phone || r.id.slice(0, 8)}
                  </p>
                  <TierBadge tier={r.subscription_tier} size={14} />
                  {r.is_frozen && (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      Frozen
                    </span>
                  )}
                  {r.is_suspended && (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      Suspended
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {TIER_LABEL[(r.subscription_tier ?? "free") as Tier]} ·{" "}
                  {r.spam_reports_count} reports
                  {r.tier_expires_at
                    ? ` · expires ${new Date(r.tier_expires_at).toLocaleDateString()}`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TIERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void setTier(r.id, t)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground disabled:opacity-50"
                      style={
                        r.subscription_tier === t
                          ? { background: "color-mix(in oklab, var(--swift-purple) 30%, transparent)" }
                          : undefined
                      }
                    >
                      {TIER_LABEL[t]}
                    </button>
                  ))}
                  {(r.is_frozen || r.is_suspended) && (
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void unfreeze(r.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      <Snowflake size={11} /> Unfreeze
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No subscribers found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
