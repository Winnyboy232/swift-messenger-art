import { useState } from "react";
import { Search, UserPlus, Users, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  name: string;
  initials: string;
  mutual: number;
  connected?: boolean;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "1", name: "Alex Rivera", initials: "AR", mutual: 12 },
  { id: "2", name: "Jamie Chen", initials: "JC", mutual: 8, connected: true },
  { id: "3", name: "Priya Patel", initials: "PP", mutual: 5 },
  { id: "4", name: "Marcus Lee", initials: "ML", mutual: 3 },
  { id: "5", name: "Sofia Alvarez", initials: "SA", mutual: 2, connected: true },
  { id: "6", name: "Noah Kim", initials: "NK", mutual: 1 },
];

export function ContactsTab() {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const filtered = SUGGESTIONS.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const visible = showAll ? filtered : filtered.slice(0, 4);

  return (
    <div className="px-4 py-4 pb-8">
      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts..."
          className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Hero banner */}
      <div
        className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card p-6 text-center"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--swift-purple) 22%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
          <Users size={30} className="text-primary-foreground" strokeWidth={2.2} />
        </div>
        <h2 className="relative text-lg font-bold text-foreground">
          Find friends already using Swift.
        </h2>
        <p className="relative mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Sync your contacts and start connecting with people you know.
        </p>

        <button
          type="button"
          onClick={() => toast.success("Contact sync coming soon")}
          className="relative mt-5 flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-primary-foreground transition active:scale-[.98]"
          style={{
            background: "var(--gradient-brand)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          Sync Contacts
        </button>

        <div className="relative my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => toast.success("Invite link copied")}
          className="relative flex h-11 w-full items-center justify-center rounded-full border border-border bg-transparent text-sm font-semibold text-foreground transition hover:bg-card/70"
        >
          Invite Friends
        </button>
      </div>

      {/* People you may know */}
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          People you may know
        </h3>
      </div>

      <ul className="space-y-2">
        {visible.map((s) => {
          const isInvited = invited[s.id];
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                {s.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.mutual} mutual contact{s.mutual === 1 ? "" : "s"}
                </p>
              </div>
              {s.connected ? (
                <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  <Check size={12} strokeWidth={3} />
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setInvited((prev) => ({ ...prev, [s.id]: !prev[s.id] }));
                    toast.success(isInvited ? "Invite cancelled" : `Invite sent to ${s.name}`);
                  }}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-card/70"
                >
                  <UserPlus size={12} strokeWidth={2.5} />
                  {isInvited ? "Invited" : "Invite"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-semibold text-primary"
        >
          {showAll ? "View less" : "View more"}
          <ChevronRight size={14} className={showAll ? "rotate-90 transition" : "transition"} />
        </button>
      )}
    </div>
  );
}
