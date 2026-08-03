import logo from "@/assets/swift-ai-logo.png";

interface Props {
  size?: number;
  className?: string;
}

/** Official circular metallic "SWIFT A.i" mark used everywhere the assistant appears. */
export function SwiftAIAvatar({ size = 48, className = "" }: Props) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 18px -4px color-mix(in oklab, var(--swift-purple) 80%, transparent)",
      }}
    >
      <img
        src={logo}
        alt="Swift AI"
        loading="lazy"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
