import { Search, Plus } from "lucide-react";
import { SwiftyLogo } from "./SwiftyLogo";

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pt-3 pb-3">
        <div className="flex items-center gap-2">
          <SwiftyLogo size={36} />
          <h1
            className="text-2xl font-extrabold tracking-tight leading-none"
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Swifty
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <HeaderIconButton label="Search">
            <Search size={18} strokeWidth={2.2} />
          </HeaderIconButton>
          <HeaderIconButton label="New">
            <Plus size={20} strokeWidth={2.4} />
          </HeaderIconButton>
        </div>
      </div>
    </header>
  );
}

function HeaderIconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground transition hover:bg-card active:scale-95"
    >
      {children}
    </button>
  );
}
