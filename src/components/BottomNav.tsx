import { MessageCircle, Radio, Users, Settings } from "lucide-react";

export type TabId = "chats" | "updates" | "contacts" | "settings";

const tabs: { id: TabId; label: string; Icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", Icon: MessageCircle },
  { id: "updates", label: "Updates", Icon: Radio },
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
                className="group relative flex w-full flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={2.2}
                  className={isActive ? "text-foreground" : "text-muted-foreground"}
                  style={
                    isActive
                      ? {
                          filter:
                            "drop-shadow(0 0 6px color-mix(in oklab, var(--swift-purple) 80%, transparent))",
                        }
                      : undefined
                  }
                />
                <span
                  className={`text-[11px] font-medium tracking-wide ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 h-1 w-8 rounded-full"
                    style={{
                      background: "var(--gradient-brand)",
                      boxShadow:
                        "0 0 10px color-mix(in oklab, var(--swift-purple) 90%, transparent), 0 0 20px color-mix(in oklab, var(--swift-purple) 60%, transparent)",
                    }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
