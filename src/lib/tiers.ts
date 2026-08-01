export type Tier = "free" | "basic" | "pro" | "ultimate";

export interface TierPlan {
  id: Tier;
  name: string;
  price: string;
  priceKobo: number;
  planCode?: string;
  popular?: boolean;
  badgeColor?: string;
  benefits: string[];
}

export const TIER_PLANS: TierPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "₦0/month",
    priceKobo: 0,
    benefits: [
      "Basic AI chat (unlimited daily text messages)",
      "Supported by ads",
      "5 AI image generations/day",
      "5 AI image-to-video credits/day (Swift AI watermark)",
      "10 document uploads/day",
      "5 heart-rate scans/day",
      "Standard AI speed",
    ],
  },
  {
    id: "basic",
    name: "Swift AI Premium Basic",
    price: "₦2,500/month",
    priceKobo: 250000,
    planCode: "PLN_4qbdplkcwm3fhf2",
    badgeColor: "#FFFFFF",
    benefits: [
      "No ads",
      "Accurate technical answers, unlimited AI text messages",
      "30 AI image generations/day",
      "20 image-to-video credits/month",
      "50 document uploads/month",
      "20 heart-rate scans/day",
      "Faster AI processing",
    ],
  },
  {
    id: "pro",
    name: "Swift AI Premium Pro",
    price: "₦5,000/month",
    priceKobo: 500000,
    planCode: "PLN_eziz9sl0o6fmghg",
    popular: true,
    badgeColor: "#3B82F6",
    benefits: [
      "Everything in Basic",
      "Unlimited AI chat",
      "Unlimited AI image generation",
      "Unlimited image-to-video (no watermark)",
      "Unlimited document analysis",
      "Unlimited heart-rate scans",
      "AI voice chat & long-term memory",
      "Priority processing + early access",
    ],
  },
  {
    id: "ultimate",
    name: "Swift AI Premium Ultimate",
    price: "₦8,000/month",
    priceKobo: 800000,
    planCode: "PLN_spa2atsrtt5owbb",
    badgeColor: "#FFD700",
    benefits: [
      "Everything in Pro",
      "Most advanced AI model access",
      "Highest generation speed",
      "Top usage priority during peak traffic",
      "Priority support",
      "Experimental beta tools",
      "Automatic inclusion of future premium tools",
    ],
  },
];

export const TIER_BADGE_COLOR: Record<Tier, string | null> = {
  free: null,
  basic: "#FFFFFF",
  pro: "#3B82F6",
  ultimate: "#FFD700",
};

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  ultimate: "Ultimate",
};

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  amountKobo: number;
  price: string;
  type: "credits" | "stickers" | "theme";
  credits?: number;
}

export const STORE_CREDITS: StoreItem[] = [
  { id: "credits-100", name: "100 AI Credits", description: "Extra image & video generations", amountKobo: 50000, price: "₦500", type: "credits", credits: 100 },
  { id: "credits-500", name: "500 AI Credits", description: "Best for regular creators", amountKobo: 200000, price: "₦2,000", type: "credits", credits: 500 },
  { id: "credits-1000", name: "1,000 AI Credits", description: "Best value pack", amountKobo: 400000, price: "₦4,000", type: "credits", credits: 1000 },
];

export const STORE_ITEMS: StoreItem[] = [
  { id: "stickers-premium", name: "Premium Sticker Pack", description: "Curated premium stickers", amountKobo: 80000, price: "₦800", type: "stickers" },
  { id: "stickers-animated", name: "Animated Sticker Pack", description: "Motion stickers for chats", amountKobo: 150000, price: "₦1,500", type: "stickers" },
  { id: "theme-premium", name: "Premium Theme", description: "A single premium chat theme", amountKobo: 100000, price: "₦1,000", type: "theme" },
  { id: "theme-bundle", name: "Theme Bundle (5–10 themes)", description: "Full premium theme collection", amountKobo: 350000, price: "₦3,500", type: "theme" },
];
