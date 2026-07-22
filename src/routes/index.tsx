import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Users, PencilLine } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { ChatsTab } from "@/components/tabs/ChatsTab";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { Splash } from "@/components/Splash";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("chats");
  const [checking, setChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
      } else {
        setChecking(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (checking) return;
    const t = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(t);
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Splash />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showSplash && <Splash />}
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col pb-24">
        <AppHeader />
        <main className="flex-1">
          {tab === "chats" && <ChatsTab />}
          {tab === "updates" && (
            <PlaceholderTab
              Icon={Radio}
              title="No updates yet"
              description="Share moments that disappear in 24 hours. Your updates will appear here."
            />
          )}
          {tab === "contacts" && (
            <PlaceholderTab
              Icon={Users}
              title="Contacts"
              description="Your Swift contacts will show up here once you connect your address book."
            />
          )}
          {tab === "settings" && <SettingsTab />}
        </main>
        {tab === "chats" && (
          <button
            type="button"
            aria-label="New message"
            className="fixed bottom-24 right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-30 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition active:scale-95"
            style={{
              background: "var(--gradient-brand)",
              boxShadow:
                "0 10px 30px -8px color-mix(in oklab, var(--swift-purple) 70%, transparent), 0 0 24px -4px color-mix(in oklab, var(--swift-blue) 60%, transparent)",
            }}
          >
            <PencilLine size={22} strokeWidth={2.2} />
          </button>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
