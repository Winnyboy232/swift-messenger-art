import { useMemo, useState } from "react";
import { X, Search, UserPlus, Users, Check, ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { placeholderChats } from "@/components/tabs/ChatsTab";
import { saveLocalChat } from "@/lib/localChats";


interface Person {
  id: string;
  name: string;
  initials: string;
}

const PEOPLE: Person[] = placeholderChats.map((c) => ({
  id: c.id,
  name: c.name,
  initials: c.initials,
}));

type View = "menu" | "contacts" | "group-members" | "group-details";

/** Shared "New chat / New group" overlay used by the header + and the pencil FAB. */
export function NewChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("menu");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q)) : PEOPLE;
  }, [query]);

  if (!open) return null;

  const close = () => {
    onClose();
    setView("menu");
    setQuery("");
    setSelected([]);
    setGroupName("");
    setAvatar(null);
  };

  const titles: Record<View, string> = {
    menu: "New",
    contacts: "Select contact",
    "group-members": "Add members",
    "group-details": "New group",
  };

  const back = () => {
    if (view === "menu") return close();
    if (view === "group-details") return setView("group-members");
    setView("menu");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6">
        <div className="mb-4 flex items-center gap-2">
          {view !== "menu" && (
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="flex-1 text-xl font-bold text-foreground">{titles[view]}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {view === "menu" && (
            <div className="space-y-2">
              <MenuRow
                icon={UserPlus}
                title="New chat"
                subtitle="Pick someone from your contacts"
                onClick={() => setView("contacts")}
              />
              <MenuRow
                icon={Users}
                title="New group"
                subtitle="Choose members, name and photo"
                onClick={() => setView("group-members")}
              />
            </div>
          )}

          {(view === "contacts" || view === "group-members") && (
            <>
              <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
                <Search size={16} className="text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search contacts"
                  className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul className="mt-3 space-y-1">
                {filtered.map((p) => {
                  const isPicked = selected.includes(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (view === "contacts") {
                            close();
                            navigate({
                              to: "/chat/$chatId",
                              params: { chatId: p.id },
                              search: { name: p.name, initials: p.initials },
                            });
                            return;
                          }
                          setSelected((s) =>
                            s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id],
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-card"
                      >
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          {p.initials}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {p.name}
                        </span>
                        {view === "group-members" && (
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              isPicked ? "border-transparent" : "border-border"
                            }`}
                            style={isPicked ? { background: "var(--gradient-brand)" } : undefined}
                          >
                            {isPicked && <Check size={13} className="text-primary-foreground" />}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No matches</li>
                )}
              </ul>
              {view === "group-members" && (
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setView("group-details")}
                  className="mt-5 flex h-13 w-full items-center justify-center rounded-2xl py-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Next · {selected.length} selected
                </button>
              )}
            </>
          )}

          {view === "group-details" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <label className="relative cursor-pointer">
                  <span
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {avatar ? (
                      <img src={avatar} alt="Group" className="h-full w-full object-cover" />
                    ) : (
                      <Camera size={26} />
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAvatar(URL.createObjectURL(file));
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">Tap to add a group photo</p>
              </div>
              <div>
                <label
                  htmlFor="group-name"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Group name
                </label>
                <input
                  id="group-name"
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Weekend Trip"
                  className="mt-2 h-13 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.map((id) => {
                  const p = PEOPLE.find((x) => x.id === id);
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                    >
                      {p?.name}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!groupName.trim() || creating}
                onClick={() => {
                  setCreating(true);
                  const label = groupName.trim();
                  const id = `group-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()
                    .toString(36)
                    .slice(-4)}`;
                  const initials = label
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const members = selected.map((sid) => {
                    const p = PEOPLE.find((x) => x.id === sid);
                    return {
                      id: sid,
                      name: p?.name ?? sid,
                      initials: p?.initials ?? "?",
                    };
                  });
                  saveLocalChat({
                    id,
                    name: label,
                    initials,
                    isGroup: true,
                    members,
                    avatar,
                    createdAt: new Date().toISOString(),
                  });
                  toast.success(`${label} created with ${members.length} members`);
                  close();
                  setCreating(false);
                  navigate({
                    to: "/chat/$chatId",
                    params: { chatId: id },
                    search: { name: label, initials },
                  });
                }}
                className="flex h-13 w-full items-center justify-center rounded-2xl py-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
              >
                {creating ? <Loader2 size={17} className="animate-spin" /> : "Create group"}
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Users;
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
