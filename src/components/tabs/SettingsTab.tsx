import { useState } from "react";
import {
  Bell,
  Lock,
  ShieldCheck,
  MessageSquare,
  Palette,
  Languages,
  Database,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  Sparkles,
  ShoppingBag,
  Gift,
  TicketCheck,
  Users,

  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { TierBadge } from "@/components/TierBadge";
import { PremiumPlans } from "@/components/premium/PremiumPlans";
import { SwiftStore } from "@/components/premium/SwiftStore";
import { GiftPremium } from "@/components/premium/GiftPremium";
import { RedeemCode } from "@/components/premium/RedeemCode";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { SettingsPage, type SettingsPageKey } from "@/components/settings/SettingsPage";
import { AccountsSheet } from "@/components/settings/AccountsSheet";
import { TIER_LABEL, type Tier } from "@/lib/tiers";


interface Row {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  page: SettingsPageKey;
}

const GROUP_1: Row[] = [
  { icon: Bell, title: "Notifications", subtitle: "Message, group & call tones", page: "notifications" },
  { icon: Lock, title: "Privacy", subtitle: "Block contacts, disappearing messages", page: "privacy" },
  { icon: ShieldCheck, title: "Security", subtitle: "Two-step verification, app lock", page: "security" },
  { icon: MessageSquare, title: "Chats", subtitle: "Theme, wallpapers, chat history", page: "chats" },
  { icon: Palette, title: "Appearance", subtitle: "Dark mode, accent colors", page: "appearance" },
  { icon: Languages, title: "Language", subtitle: "English (US)", page: "language" },
  { icon: Database, title: "Storage & Data", subtitle: "Network usage, auto-download", page: "storage" },
];

const GROUP_2: Row[] = [
  { icon: HelpCircle, title: "Help & Support", subtitle: "Help center, contact us", page: "help" },
  { icon: Info, title: "About Swift", subtitle: "Version 1.0.0", page: "about" },
];


export function SettingsTab() {
  const navigate = useNavigate();
  const { profile, email, reload } = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const name = profile?.display_name || email?.split("@")[0] || profile?.phone || "Swift User";
  const avatarUrl = profile?.avatar_url ?? null;
  const phone = profile?.phone ?? null;
  const tier = (profile?.subscription_tier ?? "free") as Tier;



  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="px-4 py-4 pb-8">
      {/* Profile card */}
      <div
        className="mb-6 flex items-center gap-4 rounded-3xl border border-border bg-card p-4"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--swift-purple) 18%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div className="relative">
          <div
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials || "S"
            )}
          </div>
          <button
            type="button"
            aria-label="Change photo"
            onClick={() => {
              setDraftName(profile?.display_name ?? name);
              setEditOpen(true);
            }}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Camera size={12} strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-base font-bold text-foreground">{name}</p>
            <TierBadge tier={tier} size={16} />
            {profile?.is_admin && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                Admin
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{email || phone || ""}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-primary">
            {profile?.is_lifetime
              ? "Lifetime Ultimate · Owner"
              : profile?.is_admin
                ? "Owner · Ultimate"
                : `${TIER_LABEL[tier]} plan`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraftName(profile?.display_name ?? name);
            setEditOpen(true);
          }}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-card/70"
        >
          Edit
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <button
          type="button"
          onClick={() => setPlansOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--swift-purple) 22%, var(--card)) 0%, var(--card) 70%)",
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles size={16} className="text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Swift Premium &amp; Plans</p>
            <p className="truncate text-xs text-muted-foreground">Basic, Pro & Ultimate tiers</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => setStoreOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
          >
            <ShoppingBag size={16} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Swift Store</p>
            <p className="truncate text-xs text-muted-foreground">
              AI credits, stickers & themes · {profile?.ai_credits ?? 0} credits
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => setGiftOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
          >
            <Gift size={16} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Gift Premium</p>
            <p className="truncate text-xs text-muted-foreground">
              Buy a plan for a friend & share a code
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => setRedeemOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
          >
            <TicketCheck size={16} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Redeem Premium Code</p>
            <p className="truncate text-xs text-muted-foreground">Activate a gifted plan</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        {profile?.is_admin && (
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--swift-blue) 18%, var(--card)) 0%, var(--card) 70%)",
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-brand)" }}
            >
              <ShieldCheck size={16} className="text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Admin Dashboard</p>
              <p className="truncate text-xs text-muted-foreground">
                Subscribers, tiers, unfreeze & gift codes
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAccountsOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in oklab, var(--swift-blue) 22%, transparent)" }}
        >
          <Users size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Switch / Add Account</p>
          <p className="truncate text-xs text-muted-foreground">Manage accounts on this device</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>

      <SettingsGroup rows={GROUP_1} onSelect={setDetail} />

      <div className="h-4" />
      <SettingsGroup rows={GROUP_2} onSelect={setDetail} />
      <div className="h-4" />


      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left text-sm font-semibold text-destructive transition hover:bg-card/70 disabled:opacity-60"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in oklab, hsl(var(--destructive)) 18%, transparent)" }}
        >
          {signingOut ? (
            <Loader2 size={16} className="animate-spin text-destructive" />
          ) : (
            <LogOut size={16} className="text-destructive" />
          )}
        </div>
        Sign Out
      </button>

      <PremiumPlans
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        currentTier={tier}
        email={email}
        userId={profile?.id ?? null}
        isAdmin={profile?.is_admin ?? false}
        onUpgraded={() => {
          setPlansOpen(false);
          void reload();
        }}
      />
      <SwiftStore
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        email={email}
        userId={profile?.id ?? null}
        credits={profile?.ai_credits ?? 0}
        onPurchased={() => void reload()}
      />
      <GiftPremium
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        email={email}
        userId={profile?.id ?? null}
        isAdmin={profile?.is_admin ?? false}
      />
      <RedeemCode
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        onRedeemed={() => void reload()}
      />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      {detail && <SettingsPage pageKey={detail.page} onClose={() => setDetail(null)} />}
      <AccountsSheet
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        currentUserId={profile?.id ?? null}
      />


      {editOpen && (
        <Sheet title="Edit profile" onClose={() => setEditOpen(false)}>
          <label
            htmlFor="display-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Display name
          </label>
          <input
            id="display-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-[15px] text-foreground outline-none focus:border-primary"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {email || phone || "Signed in to Swift"}
          </p>
          <button
            type="button"
            disabled={savingName || !draftName.trim()}
            onClick={async () => {
              if (!profile?.id) return;
              setSavingName(true);
              const { error } = await supabase
                .from("profiles")
                .update({ display_name: draftName.trim() })
                .eq("id", profile.id);
              setSavingName(false);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Profile updated");
              setEditOpen(false);
              void reload();
            }}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {savingName ? <Loader2 size={17} className="animate-spin" /> : "Save changes"}
          </button>
        </Sheet>
      )}
    </div>

  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t border-border bg-background p-5 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-sm font-semibold text-muted-foreground"
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsGroup({ rows, onSelect }: { rows: Row[]; onSelect: (row: Row) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((row, i) => (
        <button
          key={row.title}
          type="button"
          onClick={() => onSelect(row)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-card/60 ${
            i !== rows.length - 1 ? "border-b border-border/60" : ""
          }`}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
          >
            <row.icon size={16} className="text-primary" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
