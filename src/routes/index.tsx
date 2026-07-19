import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Users } from "lucide-react";
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

const tabTitles: Record<TabId, string> = {
  chats: "Chats",
  status: "Status",
  contacts: "Contacts",
  settings: "Settings",
};

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
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-24">
        <AppHeader title={tabTitles[tab]} />
        <main className="flex-1">
          {tab === "chats" && <ChatsTab />}
          {tab === "status" && (
            <PlaceholderTab
              Icon={Radio}
              title="No status updates"
              description="Share moments that disappear in 24 hours. Your status will appear here."
            />
          )}
          {tab === "contacts" && (
            <PlaceholderTab
              Icon={Users}
              title="Contacts"
              description="Your Swifty contacts will show up here once you connect your address book."
            />
          )}
          {tab === "settings" && <SettingsTab />}
        </main>
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
