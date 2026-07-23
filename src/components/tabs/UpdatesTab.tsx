import { Plus, Camera, Edit3, Eye } from "lucide-react";

type Update = {
  id: string;
  name: string;
  initials: string;
  time: string;
  preview: string;
  viewed: boolean;
  views?: number;
};

const myStatus = {
  hasStatus: true,
  time: "2h ago",
  views: 24,
};

const recentUpdates: Update[] = [
  { id: "ava", name: "Ava Chen", initials: "AC", time: "12m ago", preview: "Golden hour ✨", viewed: false },
  { id: "marcus", name: "Marcus Rivera", initials: "MR", time: "34m ago", preview: "New track dropping 🎧", viewed: false },
  { id: "design", name: "Design Team", initials: "DT", time: "1h ago", preview: "Shipped v2.0", viewed: false },
];

const viewedUpdates: Update[] = [
  { id: "priya", name: "Priya Patel", initials: "PP", time: "5h ago", preview: "Coffee run", viewed: true },
  { id: "leo", name: "Leo Park", initials: "LP", time: "8h ago", preview: "Weekend vibes", viewed: true },
  { id: "jonas", name: "Jonas Meyer", initials: "JM", time: "14h ago", preview: "🌊", viewed: true },
];

function StatusRing({
  children,
  viewed = false,
  showPlus = false,
}: {
  children: React.ReactNode;
  viewed?: boolean;
  showPlus?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]"
        style={{
          background: viewed
            ? "color-mix(in oklab, var(--border) 80%, transparent)"
            : "var(--gradient-brand)",
          boxShadow: viewed
            ? "none"
            : "0 0 12px -2px color-mix(in oklab, var(--swift-purple) 70%, transparent)",
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
          {children}
        </div>
      </div>
      {showPlus && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={12} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
      style={{ background: "var(--gradient-brand)" }}
    >
      {initials}
    </span>
  );
}

function UpdateRow({ update }: { update: Update }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card/60 active:bg-card"
    >
      <StatusRing viewed={update.viewed}>
        <Avatar initials={update.initials} />
      </StatusRing>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{update.name}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {update.time} · {update.preview}
        </p>
      </div>
    </button>
  );
}

export function UpdatesTab() {
  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Moments that vanish in 24 hours.
        </p>
      </div>

      {/* My Status */}
      <section className="px-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-card/80"
        >
          <StatusRing viewed={!myStatus.hasStatus} showPlus={!myStatus.hasStatus}>
            <Avatar initials="Me" />
          </StatusRing>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">My Status</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {myStatus.hasStatus
                ? `Updated ${myStatus.time} · ${myStatus.views} views`
                : "Tap to add an update"}
            </p>
          </div>
          {myStatus.hasStatus && (
            <span className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Eye size={12} strokeWidth={2.4} />
              {myStatus.views}
            </span>
          )}
        </button>

        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Camera size={14} strokeWidth={2.4} />
            </span>
            Camera
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Edit3 size={14} strokeWidth={2.4} />
            </span>
            Text
          </button>
        </div>
      </section>

      {/* Recent */}
      <section className="mt-6">
        <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent updates
        </h3>
        <ul className="divide-y divide-border">
          {recentUpdates.map((u) => (
            <li key={u.id}>
              <UpdateRow update={u} />
            </li>
          ))}
        </ul>
      </section>

      {/* Viewed */}
      <section className="mt-4">
        <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Viewed updates
        </h3>
        <ul className="divide-y divide-border">
          {viewedUpdates.map((u) => (
            <li key={u.id}>
              <UpdateRow update={u} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
