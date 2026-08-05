import { useState } from "react";
import { Search, Plus, X, Sparkles, HeartPulse, ImagePlus, ShoppingBag } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SwiftyLogo } from "./SwiftyLogo";
import { NewChatSheet } from "./NewChatSheet";
import { placeholderChats } from "@/components/tabs/ChatsTab";


export function AppHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? placeholderChats.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : placeholderChats;

  const quickActions = [
    { icon: Sparkles, label: "Swift AI Assistant", desc: "Chat, images & answers", go: () => navigate({ to: "/ai" }) },
    { icon: HeartPulse, label: "Heart Rate Scanner", desc: "Measure your pulse", go: () => navigate({ to: "/heart" }) },
    {
      icon: ImagePlus,
      label: "AI Image Studio",
      desc: "Generate art with Swift AI",
      go: () => navigate({ to: "/ai" }),
    },
    {
      icon: ShoppingBag,
      label: "Swift Store",
      desc: "Credits, stickers & themes",
      go: () => toast.info("Open Settings → Swift Store"),
    },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pt-3 pb-3">
          <button
            type="button"
            aria-label="Swift quick actions"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full transition active:scale-95"
          >
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
              Swift
            </h1>
          </button>
          <div className="flex items-center gap-1.5">
            <HeaderIconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={18} strokeWidth={2.2} />
            </HeaderIconButton>
            <HeaderIconButton label="New chat" onClick={() => setNewOpen(true)}>
              <Plus size={20} strokeWidth={2.4} />
            </HeaderIconButton>
          </div>
        </div>

        {menuOpen && (
          <div className="mx-auto max-w-md px-4 pb-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    a.go();
                  }}
                  className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0 active:bg-background"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <a.icon size={16} className="text-primary-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {a.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {searchOpen && (
        <Overlay title="Search Swift" onClose={() => setSearchOpen(false)}>
          <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
            <Search size={16} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats and contacts"
              className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="mt-4 space-y-1">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate({
                      to: "/chat/$chatId",
                      params: { chatId: c.id },
                      search: { name: c.name, initials: c.initials },
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-card"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {c.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.preview}</span>
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No matches</li>
            )}
          </ul>
        </Overlay>
      )}

      <NewChatSheet open={newOpen} onClose={() => setNewOpen(false)} />

    </>
  );
}

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">{children}</div>
      </div>
    </div>
  );
}

function SheetRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.99]"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Icon size={16} className="text-primary-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function HeaderIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground transition hover:bg-card active:scale-95"
    >
      {children}
    </button>
  );
}
