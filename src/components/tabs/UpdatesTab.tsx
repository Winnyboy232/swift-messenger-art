import { useEffect, useMemo, useState } from "react";
import { Plus, Camera, Image as ImageIcon, Video, Type, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusComposer, type ComposerMode } from "@/components/updates/StatusComposer";
import { StatusViewer, type ViewerUpdate } from "@/components/updates/StatusViewer";
import { StatusViewersSheet } from "@/components/updates/StatusViewersSheet";
import { StatusThumbnail } from "@/components/updates/StatusThumbnail";

type UpdateRow = {
  id: string;
  user_id: string;
  type: "image" | "video" | "text";
  media_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
};

type GroupedUpdates = {
  user_id: string;
  updates: UpdateRow[];
  latest: UpdateRow;
  hasUnseen: boolean;
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initialsFromId(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

function nameFromId(id: string, ownId: string | null): string {
  if (id === ownId) return "You";
  return `User ${id.slice(0, 6)}`;
}

export function UpdatesTab() {
  const [userId, setUserId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [viewerState, setViewerState] = useState<{
    updates: ViewerUpdate[];
    authorId: string;
  } | null>(null);
  const [viewersSheetUpdateId, setViewersSheetUpdateId] = useState<string | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const refresh = async () => {
    const { data, error } = await supabase
      .from("updates")
      .select("id,user_id,type,media_url,text_content,background_color,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setUpdates((data ?? []) as UpdateRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    refresh();
    // Track which updates the user has viewed
    supabase
      .from("update_views")
      .select("update_id")
      .eq("viewer_id", userId)
      .then(({ data }) => {
        if (data) setSeenIds(new Set(data.map((r) => r.update_id as string)));
      });

    const channel = supabase
      .channel("updates-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "updates" },
        (payload) => {
          setUpdates((prev) => {
            const row = payload.new as UpdateRow;
            return prev.some((u) => u.id === row.id) ? prev : [row, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const { myUpdates, otherGroups } = useMemo(() => {
    const mine: UpdateRow[] = [];
    const byUser = new Map<string, UpdateRow[]>();
    for (const u of updates) {
      if (u.user_id === userId) mine.push(u);
      else {
        const arr = byUser.get(u.user_id) ?? [];
        arr.push(u);
        byUser.set(u.user_id, arr);
      }
    }
    const groups: GroupedUpdates[] = [];
    for (const [uid, arr] of byUser) {
      const sorted = [...arr].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      groups.push({
        user_id: uid,
        updates: sorted,
        latest: sorted[sorted.length - 1],
        hasUnseen: sorted.some((u) => !seenIds.has(u.id)),
      });
    }
    groups.sort(
      (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime(),
    );
    return {
      myUpdates: [...mine].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
      otherGroups: groups,
    };
  }, [updates, userId, seenIds]);

  const myViewCountUpdateId = myUpdates[myUpdates.length - 1]?.id ?? null;

  const filteredRecent = otherGroups.filter((g) => g.hasUnseen);
  const filteredViewed = otherGroups.filter((g) => !g.hasUnseen);

  const q = search.trim().toLowerCase();
  const applySearch = (groups: GroupedUpdates[]) =>
    q
      ? groups.filter(
          (g) =>
            nameFromId(g.user_id, userId).toLowerCase().includes(q) ||
            (g.latest.text_content ?? "").toLowerCase().includes(q),
        )
      : groups;

  const recent = applySearch(filteredRecent);
  const viewed = applySearch(filteredViewed);

  const openViewerForGroup = (group: GroupedUpdates) => {
    setViewerState({ updates: group.updates as ViewerUpdate[], authorId: group.user_id });
    // Mark seen locally
    setSeenIds((prev) => {
      const next = new Set(prev);
      group.updates.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const openMyStatusViewer = () => {
    if (myUpdates.length === 0) {
      setFabMenuOpen(true);
      return;
    }
    setViewerState({ updates: myUpdates as ViewerUpdate[], authorId: userId! });
  };

  const quickActions: { id: ComposerMode; label: string; Icon: typeof Camera; gradient?: boolean }[] = [
    { id: "camera", label: "Camera", Icon: Camera, gradient: true },
    { id: "photo", label: "Photo", Icon: ImageIcon },
    { id: "video", label: "Video", Icon: Video },
    { id: "text", label: "Text", Icon: Type },
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Moments that vanish in 24 hours.
        </p>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search updates..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* My Status */}
      <section className="px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <button
            type="button"
            onClick={openMyStatusViewer}
            className="relative shrink-0"
            aria-label="My status"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]"
              style={{
                background: myUpdates.length > 0
                  ? "var(--gradient-brand)"
                  : "color-mix(in oklab, var(--border) 80%, transparent)",
                boxShadow: myUpdates.length > 0
                  ? "0 0 12px -2px color-mix(in oklab, var(--swift-purple) 70%, transparent)"
                  : "none",
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                <span
                  className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Me
                </span>
              </div>
            </div>
            {myUpdates.length === 0 && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Plus size={12} strokeWidth={3} />
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openMyStatusViewer}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-[15px] font-semibold text-foreground">My Status</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {myUpdates.length > 0
                ? `Updated ${timeAgo(myUpdates[myUpdates.length - 1].created_at)} · ${myUpdates.length} ${
                    myUpdates.length === 1 ? "update" : "updates"
                  }`
                : "Tap to add an update"}
            </p>
          </button>
          {myViewCountUpdateId && (
            <button
              type="button"
              onClick={() => setViewersSheetUpdateId(myViewCountUpdateId)}
              className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
              aria-label="View viewers"
            >
              <Eye size={12} strokeWidth={2.4} />
              Viewers
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {quickActions.map(({ id, label, Icon, gradient }) => (
            <button
              key={id}
              type="button"
              onClick={() => setComposerMode(id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground transition-colors hover:bg-card/80"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground"
                style={{
                  background: gradient
                    ? "var(--gradient-brand)"
                    : "color-mix(in oklab, var(--swift-purple) 20%, transparent)",
                  boxShadow: gradient
                    ? "0 0 12px -3px color-mix(in oklab, var(--swift-purple) 70%, transparent)"
                    : "none",
                  color: gradient ? undefined : "var(--swift-blue)",
                }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="mt-6">
        <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent updates
        </h3>
        {loading ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Loading...</p>
        ) : recent.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            {q ? "No matching updates." : "No new updates."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((g) => (
              <UpdateRowItem
                key={g.user_id}
                group={g}
                onOpen={() => openViewerForGroup(g)}
                unseen
                ownId={userId}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Viewed */}
      {viewed.length > 0 && (
        <section className="mt-4">
          <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Viewed updates
          </h3>
          <ul className="divide-y divide-border">
            {viewed.map((g) => (
              <UpdateRowItem
                key={g.user_id}
                group={g}
                onOpen={() => openViewerForGroup(g)}
                unseen={false}
                ownId={userId}
              />
            ))}
          </ul>
        </section>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label="New status"
        onClick={() => setFabMenuOpen(true)}
        className="fixed bottom-24 right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-30 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition active:scale-95"
        style={{
          background: "var(--gradient-brand)",
          boxShadow:
            "0 10px 30px -8px color-mix(in oklab, var(--swift-purple) 70%, transparent), 0 0 24px -4px color-mix(in oklab, var(--swift-blue) 60%, transparent)",
        }}
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>

      {/* FAB Menu */}
      {fabMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setFabMenuOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl border-t border-border bg-background p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="mb-3 text-center text-sm font-semibold text-foreground">Create a status</p>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFabMenuOpen(false);
                    setComposerMode(id);
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-xs font-medium text-foreground"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <Icon size={18} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      {composerMode && userId && (
        <StatusComposer
          mode={composerMode}
          userId={userId}
          onClose={() => setComposerMode(null)}
          onPosted={refresh}
        />
      )}

      {/* Full-screen viewer */}
      {viewerState && userId && (
        <StatusViewer
          updates={viewerState.updates}
          authorName={nameFromId(viewerState.authorId, userId)}
          authorInitials={initialsFromId(viewerState.authorId)}
          currentUserId={userId}
          onClose={() => setViewerState(null)}
          onOpenViewers={
            viewerState.authorId === userId
              ? (uid) => setViewersSheetUpdateId(uid)
              : undefined
          }
        />
      )}

      {/* Viewers sheet */}
      {viewersSheetUpdateId && (
        <StatusViewersSheet
          updateId={viewersSheetUpdateId}
          onClose={() => setViewersSheetUpdateId(null)}
        />
      )}
    </div>
  );
}

function UpdateRowItem({
  group,
  onOpen,
  unseen,
  ownId,
}: {
  group: GroupedUpdates;
  onOpen: () => void;
  unseen: boolean;
  ownId: string | null;
}) {
  const name = nameFromId(group.user_id, ownId);
  const initials = initialsFromId(group.user_id);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card/60 active:bg-card"
      >
        <div className="relative shrink-0">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]"
            style={{
              background: unseen
                ? "var(--gradient-brand)"
                : "color-mix(in oklab, var(--border) 80%, transparent)",
              boxShadow: unseen
                ? "0 0 12px -2px color-mix(in oklab, var(--swift-purple) 70%, transparent)"
                : "none",
            }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
              <span
                className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                {initials}
              </span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
            {unseen && (
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: "var(--swift-blue)",
                  boxShadow: "0 0 8px var(--swift-purple)",
                }}
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {timeAgo(group.latest.created_at)}
            {group.latest.text_content ? ` · ${group.latest.text_content}` : ""}
          </p>
        </div>
        <StatusThumbnail
          type={group.latest.type}
          media_url={group.latest.media_url}
          text_content={group.latest.text_content}
          background_color={group.latest.background_color}
        />
      </button>
    </li>
  );
}
