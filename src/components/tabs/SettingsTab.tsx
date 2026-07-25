import { useEffect, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState<string>("Swift User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      setPhone(user.phone ?? null);
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        user.email?.split("@")[0] ||
        user.phone ||
        "Swift User";
      setName(metaName);
      setAvatarUrl((meta.avatar_url as string) ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) setName(profile.display_name);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    });
  }, []);

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
          <p className="truncate text-base font-bold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email || phone || ""}</p>
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
