import { MessageCircle, Radio, Users, Settings } from "lucide-react";

export type TabId = "chats" | "status" | "contacts" | "settings";

const tabs: { id: TabId; label: string; Icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", Icon: MessageCircle },
  { id: "status", label: "Status", Icon: Radio },
  { id: "contacts", label: "Contacts", Icon: Users },
  { id: "settings", label: "Settings", Icon: Settings },
];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                className="group flex w-full flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                  style={
                    isActive
                      ? {
                          background: "var(--gradient-brand)",
                          boxShadow: "var(--shadow-glow)",
                        }
                      : undefined
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={2.2}
                    className={isActive ? "text-primary-foreground" : "text-muted-foreground"}
                  />
                </span>
                <span
                  className={`text-[11px] font-medium tracking-wide ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
