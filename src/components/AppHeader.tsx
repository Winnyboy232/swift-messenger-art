import { SwiftyLogo } from "./SwiftyLogo";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <SwiftyLogo size={64} />
          <h1
            className="text-4xl font-extrabold tracking-tight leading-none"
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFeatureSettings: '"ss01"',
            }}
          >
            Swifty
          </h1>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.32em] text-muted-foreground uppercase">
          {title}
        </span>
      </div>
    </header>
  );
}
