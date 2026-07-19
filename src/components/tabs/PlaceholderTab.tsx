import type { LucideIcon } from "lucide-react";

interface PlaceholderTabProps {
  Icon: LucideIcon;
  title: string;
  description: string;
}

export function PlaceholderTab({ Icon, title, description }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
      >
        <Icon size={28} className="text-primary-foreground" strokeWidth={2.2} />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
