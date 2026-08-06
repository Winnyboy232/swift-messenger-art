import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isOwnerIdentity } from "@/lib/adminOverride";
import type { Tier } from "@/lib/tiers";

export interface SwiftProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  subscription_tier: Tier;
  is_admin: boolean;
  is_lifetime: boolean;
  is_frozen: boolean;
  is_suspended: boolean;
  ai_credits: number;
}

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
    const userEmail = user.email ?? null;
    setEmail(userEmail);

    // Session checks: automated 48-hour unfreeze + premium expiry.
    try {
      await supabase.rpc("process_my_freeze_appeal" as never);
      await supabase.rpc("expire_my_tier" as never);
    } catch {
      /* non-fatal */
    }

    const authPhone =
      user.phone ?? (user.user_metadata?.["phone"] as string | undefined) ?? null;

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, phone, subscription_tier, is_admin, is_frozen, is_suspended, ai_credits",
      )
      .eq("id", user.id)
      .maybeSingle();

    const row = (data ?? null) as unknown as Omit<SwiftProfile, "is_lifetime"> | null;
    const phone = row?.phone ?? authPhone;
    const owner = isOwnerIdentity(userEmail, phone);

    if (owner && row && (!row.is_admin || row.subscription_tier !== "ultimate")) {
      // Best-effort DB sync; the UI is already unlocked locally regardless.
      void supabase
        .from("profiles")
        .update({ is_admin: true, subscription_tier: "ultimate", is_frozen: false })
        .eq("id", user.id);
    }

    if (row) {
      setProfile({
        ...row,
        phone,
        subscription_tier: owner ? "ultimate" : row.subscription_tier,
        is_admin: owner || row.is_admin,
        is_lifetime: owner,
        is_frozen: owner ? false : row.is_frozen,
        is_suspended: owner ? false : row.is_suspended,
      });
    } else if (owner) {
      setProfile({
        id: user.id,
        display_name: (user.user_metadata?.["full_name"] as string) ?? null,
        avatar_url: null,
        phone,
        subscription_tier: "ultimate",
        is_admin: true,
        is_lifetime: true,
        is_frozen: false,
        is_suspended: false,
        ai_credits: 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, email, loading, reload: load };
}
