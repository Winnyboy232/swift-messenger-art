import logo from "@/assets/swifty-logo.png";

interface Props {
  size?: number;
  className?: string;
}

/** Distinct gradient-ringed avatar for the Swift AI assistant. */
export function SwiftAIAvatar({ size = 48, className = "" }: Props) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "var(--gradient-brand)",
        boxShadow: "0 0 18px -4px color-mix(in oklab, var(--swift-purple) 80%, transparent)",
      }}
    >
      <img
        src={logo}
        alt="Swift AI"
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        style={{ width: size * 0.68, height: size * 0.68 }}
      />
    </span>
  );
}
