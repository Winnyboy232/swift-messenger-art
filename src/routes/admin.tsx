import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  CircleDollarSign,
  FileCode2,
  Gift,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Megaphone,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierBadge } from "@/components/TierBadge";
import { supabase } from "@/integrations/supabase/client";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: "Swift Admin Portal" },
      { name: "description", content: "Private administration portal for Swift." },
      { property: "og:title", content: "Swift Admin Portal" },
      { property: "og:description", content: "Private administration portal for Swift." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type TabId =
  | "overview"
  | "users"
  | "subscriptions"
  | "gift-codes"
  | "revenue"
  | "ai"
  | "analytics"
  | "moderation"
  | "content"
  | "settings"
  | "security";

type AdminUser = {
  id: string;
  display_name: string | null;
  phone: string | null;
  subscription_tier: string;
  is_frozen: boolean;
  is_suspended: boolean;
  spam_reports_count: number;
  tier_expires_at: string | null;
};

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  target_user_id: string | null;
};

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "subscriptions", label: "Subscription Management", icon: CircleDollarSign },
  { id: "gift-codes", label: "Gift Code Management", icon: Gift },
  { id: "revenue", label: "Revenue & Payments", icon: BarChart3 },
  { id: "ai", label: "Swift AI Management", icon: Bot },
  { id: "analytics", label: "AI & App Analytics", icon: Activity },
  { id: "moderation", label: "Reports & Moderation", icon: ShieldAlert },
  { id: "content", label: "Updates/Content Management", icon: Megaphone },
  { id: "settings", label: "System & Admin Settings", icon: Settings2 },
  { id: "security", label: "Security & Admin Activity Log", icon: LockKeyhole },
];

const TIERS: Tier[] = ["free", "basic", "pro", "ultimate"];

function AdminRoute() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [tab, setTab] = useState<TabId>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [giftCount, setGiftCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [configCount, setConfigCount] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [genTier, setGenTier] = useState<Tier>("pro");
  const [lastCode, setLastCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profilesResult, auditResult, giftsResult, paymentsResult, configResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, phone, subscription_tier, is_frozen, is_suspended, spam_reports_count, tier_expires_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("admin_audit_log").select("id, action, entity_type, created_at, target_user_id").order("created_at", { ascending: false }).limit(25),
      supabase.from("gift_codes").select("id", { count: "exact", head: true }),
      supabase.from("purchases").select("id", { count: "exact", head: true }),
      supabase.from("ai_limits_config").select("id", { count: "exact", head: true }),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (auditResult.error) throw auditResult.error;
    setUsers((profilesResult.data ?? []) as AdminUser[]);
    setAudit((auditResult.data ?? []) as AuditEntry[]);
    setGiftCount(giftsResult.count ?? 0);
    setPaymentsCount(paymentsResult.count ?? 0);
    setConfigCount(configResult.count ?? 0);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (!active) return;
      if (error || isAdmin !== true) {
        setStatus("denied");
        return;
      }
      try {
        await loadData();
        if (active) setStatus("allowed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load admin data");
        if (active) setStatus("allowed");
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData, navigate]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.display_name, user.phone, user.subscription_tier].some((value) =>
        (value ?? "").toLowerCase().includes(normalized),
      ),
    );
  }, [query, users]);

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
    await loadData();
  };

  const unfreeze = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_unfreeze" as never, { _target: id } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account restored");
    await loadData();
  };

  const generateCode = async () => {
    const { data, error } = await supabase.rpc("generate_gift_code" as never, {
      _plan_tier: genTier,
      _duration_months: 1,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLastCode(data as unknown as string);
    await loadData();
    toast.success("Gift code generated");
  };

  if (status === "checking") {
    return <div className="flex min-h-screen items-center justify-center bg-background text-primary"><Loader2 className="animate-spin" /></div>;
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
        <div className="max-w-sm">
          <ShieldAlert className="mx-auto text-destructive" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">This private portal is only available to approved Swift administrators.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Return to Swift</Button>
        </div>
      </div>
    );
  }

  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><ShieldCheck size={20} /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Swift private space</p><h1 className="text-xl font-bold">Admin Portal</h1></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/" })}>Exit portal</Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 lg:w-64">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
            {TABS.map((item) => {
              const Icon = item.icon;
              return <Button key={item.id} variant={tab === item.id ? "secondary" : "ghost"} className="justify-start whitespace-nowrap lg:w-full" onClick={() => setTab(item.id)}><Icon /><span>{item.label}</span>{tab === item.id && <ChevronRight className="ml-auto" />}</Button>;
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-3"><ActiveIcon className="text-primary" size={20} /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Control center</p><h2 className="text-2xl font-bold">{activeTab.label}</h2></div></div>
          {tab === "overview" && <Overview users={users} giftCount={giftCount} paymentsCount={paymentsCount} audit={audit} onOpen={setTab} />}
          {tab === "users" && <UserManagement users={filteredUsers} query={query} setQuery={setQuery} busy={busy} setTier={setTier} unfreeze={unfreeze} />}
          {tab === "subscriptions" && <Subscriptions users={users} onOpen={() => setTab("users")} />}
          {tab === "gift-codes" && <GiftCodes genTier={genTier} setGenTier={setGenTier} generateCode={generateCode} lastCode={lastCode} giftCount={giftCount} />}
          {tab === "revenue" && <EmptySection icon={CircleDollarSign} title="Revenue & Payments" detail={`${paymentsCount} payment records are available for review.`} />}
          {tab === "ai" && <EmptySection icon={Bot} title="Swift AI Management" detail="AI generation controls and tier limits are connected to the private backend." badge={`${configCount} tier configs`} />}
          {tab === "analytics" && <EmptySection icon={BarChart3} title="AI & App Analytics" detail="Usage and product analytics are ready for the next reporting views." />}
          {tab === "moderation" && <EmptySection icon={ShieldAlert} title="Reports & Moderation" detail={`${users.filter((user) => user.spam_reports_count > 0 || user.is_suspended).length} users need moderation attention.`} />}
          {tab === "content" && <EmptySection icon={Megaphone} title="Updates/Content Management" detail="Content publishing controls belong here and remain private to administrators." />}
          {tab === "settings" && <EmptySection icon={Settings2} title="System & Admin Settings" detail="System flags and administrator settings are protected by role-based database rules." />}
          {tab === "security" && <AuditLog audit={audit} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ users, giftCount, paymentsCount, audit, onOpen }: { users: AdminUser[]; giftCount: number; paymentsCount: number; audit: AuditEntry[]; onOpen: (tab: TabId) => void }) {
  const suspended = users.filter((user) => user.is_suspended).length;
  const frozen = users.filter((user) => user.is_frozen).length;
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    ["Total users", users.length, Users], ["Gift codes", giftCount, Gift], ["Payments", paymentsCount, CircleDollarSign], ["Needs review", suspended + frozen, ShieldAlert],
  ].map(([label, value, Icon]) => { const StatIcon = Icon as typeof Users; return <div key={label as string} className="rounded-xl border border-border bg-card p-4"><StatIcon className="text-primary" size={18} /><p className="mt-4 text-2xl font-bold">{value as number}</p><p className="text-xs text-muted-foreground">{label as string}</p></div>; })}</div><div className="grid gap-6 xl:grid-cols-2"><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Operations</h3><Activity className="text-muted-foreground" size={18} /></div><div className="mt-4 space-y-2"><Button variant="outline" className="w-full justify-between" onClick={() => onOpen("users")}>Review users <ChevronRight /></Button><Button variant="outline" className="w-full justify-between" onClick={() => onOpen("gift-codes")}>Create a gift code <ChevronRight /></Button><Button variant="outline" className="w-full justify-between" onClick={() => onOpen("security")}>Open activity log <ChevronRight /></Button></div></div><AuditLog audit={audit.slice(0, 6)} /></div></div>;
}

function UserManagement({ users, query, setQuery, busy, setTier, unfreeze }: { users: AdminUser[]; query: string; setQuery: (value: string) => void; busy: string | null; setTier: (id: string, tier: Tier) => Promise<void>; unfreeze: (id: string) => Promise<void> }) {
  return <div className="space-y-4"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users by name, phone, or tier" className="pl-9" /></div><div className="space-y-3">{users.map((user) => <div key={user.id} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{user.display_name || user.phone || user.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{user.phone || "No phone"} · {user.spam_reports_count} reports</p></div><div className="flex items-center gap-2"><TierBadge tier={user.subscription_tier} size={15} />{user.is_suspended && <span className="rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-bold text-destructive">Suspended</span>}{user.is_frozen && <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">Frozen</span>}</div></div><div className="mt-3 flex flex-wrap gap-2">{TIERS.map((tier) => <Button key={tier} size="sm" variant={user.subscription_tier === tier ? "secondary" : "outline"} disabled={busy === user.id} onClick={() => void setTier(user.id, tier)}>{TIER_LABEL[tier]}</Button>)}{(user.is_frozen || user.is_suspended) && <Button size="sm" variant="outline" disabled={busy === user.id} onClick={() => void unfreeze(user.id)}><Snowflake />Restore</Button>}</div></div>)}{users.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No users match that search.</p>}</div></div>;
}

function Subscriptions({ users, onOpen }: { users: AdminUser[]; onOpen: () => void }) { const counts = TIERS.map((tier) => ({ tier, count: users.filter((user) => user.subscription_tier === tier).length })); return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{counts.map(({ tier, count }) => <div key={tier} className="rounded-xl border border-border bg-card p-5"><TierBadge tier={tier} size={18} /><p className="mt-4 text-3xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{TIER_LABEL[tier]} accounts</p></div>)}</div><Button onClick={onOpen}>Manage subscriber tiers</Button></div>; }

function GiftCodes({ genTier, setGenTier, generateCode, lastCode, giftCount }: { genTier: Tier; setGenTier: (tier: Tier) => void; generateCode: () => Promise<void>; lastCode: string | null; giftCount: number }) { return <div className="max-w-xl rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Gift code generator</h3><p className="mt-1 text-xs text-muted-foreground">{giftCount} codes in the system</p></div><Gift className="text-primary" /></div><div className="mt-5 flex flex-wrap gap-2">{TIERS.filter((tier) => tier !== "free").map((tier) => <Button key={tier} variant={genTier === tier ? "secondary" : "outline"} onClick={() => setGenTier(tier)}>{TIER_LABEL[tier]}</Button>)}</div><Button className="mt-4 w-full" onClick={() => void generateCode()}>Generate one-month code</Button>{lastCode && <Button variant="outline" className="mt-3 w-full font-mono tracking-widest" onClick={() => { void navigator.clipboard.writeText(lastCode); toast.success("Code copied"); }}>{lastCode}</Button>}</div>; }

function AuditLog({ audit }: { audit: AuditEntry[] }) { return <div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Recent admin activity</h3><p className="mt-1 text-xs text-muted-foreground">Role-protected audit trail</p></div><FileCode2 className="text-primary" /></div><div className="mt-5 space-y-3">{audit.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-semibold">{entry.action.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{entry.entity_type}{entry.target_user_id ? ` · ${entry.target_user_id.slice(0, 8)}` : ""}</p></div><time className="text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</time></div>)}{audit.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}</div></div>; }

function EmptySection({ icon: Icon, title, detail, badge }: { icon: typeof Bot; title: string; detail: string; badge?: string }) { return <div className="max-w-2xl rounded-xl border border-border bg-card p-8"><Icon className="text-primary" size={28} /><div className="mt-5 flex items-center gap-3"><h3 className="text-lg font-bold">{title}</h3>{badge && <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">{badge}</span>}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></div>; }