import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Users, Settings } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { ChatsTab } from "@/components/tabs/ChatsTab";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";
import { Splash } from "@/components/Splash";

export const Route = createFileRoute("/")({
  component: Index,
});

const tabTitles: Record<TabId, string> = {
  chats: "Chats",
  status: "Status",
  contacts: "Contacts",
  settings: "Settings",
};

function Index() {
  const [tab, setTab] = useState<TabId>("chats");
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

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
          {tab === "settings" && (
            <PlaceholderTab
              Icon={Settings}
              title="Settings"
              description="Personalize notifications, privacy, and appearance. Coming soon."
            />
          )}
        </main>
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
