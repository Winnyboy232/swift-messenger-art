import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tiers";

export interface SwiftProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  subscription_tier: Tier;
  is_admin: boolean;
  is_frozen: boolean;
  is_suspended: boolean;
  ai_credits: number;
}

const OWNER_PHONES = [
  "+2348125522479",
  "+2347078863274",
  "07078863274",
  "2347078863274",
  "2348125522479",
];

export function useProfile() {
  const [profile, setProfile] = useState<SwiftProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setEmail(user.email ?? null);

    // Session check for the automated 48-hour unfreeze.
    try {
      await supabase.rpc("process_my_freeze_appeal" as never);
    } catch {
      /* non-fatal */
    }

    const phone = user.phone ?? (user.user_metadata?.["phone"] as string | undefined) ?? null;
    if (phone && OWNER_PHONES.includes(phone)) {
      await supabase
        .from("profiles")
        .update({ is_admin: true, subscription_tier: "ultimate", is_frozen: false })
        .eq("id", user.id);
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, phone, subscription_tier, is_admin, is_frozen, is_suspended, ai_credits",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (data) setProfile(data as unknown as SwiftProfile);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, email, loading, reload: load };
}
