import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PencilLine } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { ChatsTab } from "@/components/tabs/ChatsTab";
import { UpdatesTab } from "@/components/tabs/UpdatesTab";
import { ContactsTab } from "@/components/tabs/ContactsTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { NewChatSheet } from "@/components/NewChatSheet";
import { Splash } from "@/components/Splash";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { FreezeOverlay } from "@/components/premium/FreezeOverlay";


export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { profile, reload: reloadProfile } = useProfile();
  const [tab, setTab] = useState<TabId>("chats");
  const [checking, setChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const isImmune = !!profile && (profile.is_admin || profile.subscription_tier !== "free");
  const isFrozen = !!profile?.is_frozen && !isImmune;


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
          {tab === "updates" && <UpdatesTab />}
          {tab === "contacts" && <ContactsTab />}
          {tab === "settings" && <SettingsTab />}
        </main>
        {tab === "chats" && (
          <div className="fixed bottom-24 right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-30">
            <button
              type="button"
              aria-label="New chat"
              onClick={() => setNewOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition active:scale-95"
              style={{
                background: "var(--gradient-brand)",
                boxShadow:
                  "0 10px 30px -8px color-mix(in oklab, var(--swift-purple) 70%, transparent), 0 0 24px -4px color-mix(in oklab, var(--swift-blue) 60%, transparent)",
              }}
            >
              <PencilLine size={21} strokeWidth={2.2} />
            </button>
          </div>
        )}
        <NewChatSheet open={newOpen} onClose={() => setNewOpen(false)} />


      </div>
      {isFrozen && profile && (
        <FreezeOverlay userId={profile.id} onAppealed={() => void reloadProfile()} />
      )}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
