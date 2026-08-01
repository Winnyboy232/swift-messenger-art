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
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { TierBadge } from "@/components/TierBadge";
import { PremiumPlans } from "@/components/premium/PremiumPlans";
import { SwiftStore } from "@/components/premium/SwiftStore";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

interface Row {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const GROUP_1: Row[] = [
  { icon: Bell, title: "Notifications", subtitle: "Message, group & call tones" },
  { icon: Lock, title: "Privacy", subtitle: "Block contacts, disappearing messages" },
  { icon: ShieldCheck, title: "Security", subtitle: "Two-step verification, change number" },
  { icon: MessageSquare, title: "Chats", subtitle: "Theme, wallpapers, chat history" },
  { icon: Palette, title: "Appearance", subtitle: "Dark mode, accent colors" },
  { icon: Languages, title: "Language", subtitle: "English (US)" },
  { icon: Database, title: "Storage & Data", subtitle: "Network usage, auto-download" },
];

const GROUP_2: Row[] = [
  { icon: HelpCircle, title: "Help & Support", subtitle: "Help center, contact us" },
  { icon: Info, title: "About Swift", subtitle: "Version 1.0.0" },
];

export function SettingsTab() {
  const navigate = useNavigate();
  const { profile, email, reload } = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

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
            onClick={() => toast.info("Photo editing coming soon")}
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
          </div>
          <p className="truncate text-xs text-muted-foreground">{email || phone || ""}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-primary">
            {profile?.is_admin ? "Owner · Ultimate" : `${TIER_LABEL[tier]} plan`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info("Edit profile coming soon")}
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
      </div>

      <SettingsGroup rows={GROUP_1} />
      <div className="h-4" />
      <SettingsGroup rows={GROUP_2} />
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
    </div>
  );
}

function SettingsGroup({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((row, i) => (
        <button
          key={row.title}
          type="button"
          onClick={() => toast.info(`${row.title} coming soon`)}
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
