import logo from "@/assets/swifty-logo.png";

interface SwiftyLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function SwiftyLogo({ size = 32, showWordmark = false, className = "" }: SwiftyLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logo}
        alt="Swift logo"
        width={size}
        height={size}
        loading="lazy"
        style={{
          width: size,
          height: size,
          filter: "drop-shadow(0 0 10px color-mix(in oklab, var(--swift-blue) 60%, transparent)) drop-shadow(0 0 18px color-mix(in oklab, var(--swift-purple) 40%, transparent))",
        }}
      />
      {showWordmark && (
        <span
          className="text-xl font-semibold tracking-tight"
          style={{
            background: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Swifty
        </span>
      )}
    </div>
  );
}
