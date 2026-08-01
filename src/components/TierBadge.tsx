import { TIER_BADGE_COLOR, type Tier } from "@/lib/tiers";

interface Props {
  tier: Tier | string | null | undefined;
  size?: number;
  className?: string;
}

/** Scalloped star/seal badge with an inner checkmark. */
export function TierBadge({ tier, size = 16, className }: Props) {
  const color = TIER_BADGE_COLOR[(tier ?? "free") as Tier];
  if (!color) return null;

  const points = 12;
  const outer = 12;
  const inner = 9.6;
  const path = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={`${tier} verified badge`}
      style={{ filter: `drop-shadow(0 0 4px ${color}66)`, flexShrink: 0 }}
    >
      <polygon points={path} fill={color} />
      <path
        d="M7.8 12.2l2.7 2.7 5.6-5.6"
        fill="none"
        stroke={color === "#FFFFFF" ? "#12072B" : "#0B0716"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
