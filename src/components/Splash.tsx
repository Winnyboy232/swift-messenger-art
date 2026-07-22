import { SwiftyLogo } from "./SwiftyLogo";

export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--swift-purple) 25%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        <SwiftyLogo size={96} />
        <div className="flex flex-col items-center gap-1.5">
          <span
            className="text-3xl font-semibold tracking-tight"
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Swift
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Messaging, refined
          </span>
        </div>
      </div>
    </div>
  );
}
