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
      <div className="mx-auto flex max-w-md flex-col items-center gap-1 px-4 py-3">
        <SwiftyLogo size={28} />
        <h1 className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {title}
        </h1>
      </div>
    </header>
  );
}
