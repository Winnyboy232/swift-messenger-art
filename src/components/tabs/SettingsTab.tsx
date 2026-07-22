import { useEffect, useState } from "react";
import { LogOut, User, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SettingsTab() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setPhone(data.user?.phone ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--gradient-brand)" }}
        >
          <User size={20} className="text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {email || phone || "Signed in"}
          </p>
          <p className="text-xs text-muted-foreground">Your Swift account</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold text-destructive transition hover:bg-card/70 disabled:opacity-60"
      >
        {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        Sign out
      </button>
    </div>
  );
}
