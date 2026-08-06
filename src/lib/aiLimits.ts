import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tiers";

export type UsageKind = "image" | "video" | "document" | "heart_scan";

export interface TierLimit {
  daily: number | null;
  monthly: number | null;
}

/** null = unlimited. Mirrors the plans in src/lib/tiers.ts. */
export const TIER_LIMITS: Record<Tier, Record<UsageKind, TierLimit>> = {
  free: {
    image: { daily: 5, monthly: null },
    video: { daily: 5, monthly: null },
    document: { daily: 10, monthly: null },
    heart_scan: { daily: 5, monthly: null },
  },
  basic: {
    image: { daily: 30, monthly: null },
    video: { daily: null, monthly: 20 },
    document: { daily: null, monthly: 50 },
    heart_scan: { daily: 20, monthly: null },
  },
  pro: {
    image: { daily: null, monthly: null },
    video: { daily: null, monthly: null },
    document: { daily: null, monthly: null },
    heart_scan: { daily: null, monthly: null },
  },
  ultimate: {
    image: { daily: null, monthly: null },
    video: { daily: null, monthly: null },
    document: { daily: null, monthly: null },
    heart_scan: { daily: null, monthly: null },
  },
};

export interface UsageResult {
  ok: boolean;
  error?: string;
  unlimited?: boolean;
  usedCredit?: boolean;
  watermark?: boolean;
  remainingToday?: number;
}

/** Free-tier outputs always carry the Swift AI watermark. */
export function needsWatermark(tier: Tier, isAdmin: boolean): boolean {
  return !isAdmin && tier === "free";
}

/**
 * Reserves one unit of an AI feature for the signed-in user.
 * Falls back to purchased store credits when the tier allowance is exhausted.
 */
export async function consumeUsage(
  tier: Tier,
  kind: UsageKind,
  unlimited = false,
): Promise<UsageResult> {
  // Pro/Ultimate (incl. lifetime owner override) never hit the quota ledger.
  if (unlimited || tier === "pro" || tier === "ultimate") {
    return { ok: true, unlimited: true, watermark: false };
  }
  const limit = TIER_LIMITS[tier][kind];
  const { data, error } = await supabase.rpc("consume_ai_usage" as never, {
    _kind: kind,
    _daily_limit: limit.daily,
    _monthly_limit: limit.monthly,
  } as never);
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: "Unknown error" }) as unknown as UsageResult;
}

