import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  UserPlus,
  Search,
  Bell,
  Image as ImageIcon,
  Lock,
  Timer,
  Database,
  Eye,
  ChevronRight,
  LogOut,
  Flag,
  Trash2,
  Star,
  ListPlus,
  History,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { LocalChat } from "@/lib/localChats";
import { saveLocalChat } from "@/lib/localChats";

interface MediaItem {
  id: string;
  url?: string;
  type: string | null;
  time: string;
}

interface Props {
  chat: LocalChat;
  media: MediaItem[];
  onClose: () => void;
  onCall: (kind: "audio" | "video") => void;
  onClearChat: () => void;
  onExit: () => void;
}

/** Full group info screen: avatar, actions, media carousel, options and members. */
export function GroupInfo({ chat, media, onClose, onCall, onClearChat, onExit }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [description, setDescription] = useState(chat.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const members = chat.members;
  const visible = showAll ? members : members.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-md pb-16">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-3 backdrop-blur-xl">
          <button type="button" aria-label="Back" onClick={onClose} className="text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[15px] font-bold text-foreground">Group info</h2>
        </header>

        <div className="flex flex-col items-center px-4 pt-6">
          <div
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            {chat.avatar ? (
              <img src={chat.avatar} alt={chat.name} className="h-full w-full object-cover" />
            ) : (
              chat.initials
            )}
          </div>
          <h3 className="mt-3 text-xl font-bold text-foreground">{chat.name}</h3>
          <p className="text-xs text-muted-foreground">Group · {members.length} members</p>

          {editingDesc ? (
            <div className="mt-3 w-full">
              <textarea
                value={description}
                autoFocus
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add group description"
                className="h-20 w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  saveLocalChat({ ...chat, description });
                  setEditingDesc(false);
                  toast.success("Description saved");
                }}
                className="mt-2 h-10 w-full rounded-xl text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                Save description
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Pencil size={12} />
              {description || "Add group description"}
            </button>
          )}

          <div className="mt-5 grid w-full grid-cols-4 gap-2">
            <Action icon={Phone} label="Audio" onClick={() => onCall("audio")} />
            <Action icon={Video} label="Video" onClick={() => onCall("video")} />
            <Action icon={UserPlus} label="Add" onClick={() => toast("Invite link copied soon")} />
            <Action icon={Search} label="Search" onClick={() => toast("Search in group coming soon")} />
          </div>
        </div>

        <section className="mt-6 px-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Media, links, and docs</p>
            <span className="text-xs text-muted-foreground">{media.length}</span>
          </div>
          {media.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
              Shared photos, audio and files will appear here.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-card"
                >
                  {m.type === "image" && m.url ? (
                    <img src={m.url} alt="Shared" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImageIcon size={18} />
                      <span className="text-[10px]">{m.time}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 space-y-2 px-4">
          <Row icon={Database} title="Manage storage" subtitle="Free up space in this group" />
          <Row icon={Bell} title="Notifications" subtitle="Custom tone & mute options" />
          <Row icon={Eye} title="Media visibility" subtitle="Show newly downloaded media" />
          <Row icon={Lock} title="Encryption" subtitle="Messages are end-to-end encrypted" />
          <Row icon={Timer} title="Disappearing messages" subtitle="Off" />
        </section>

        <section className="mt-6 px-4">
          <p className="mb-2 text-sm font-bold text-foreground">{members.length} members</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {visible.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {m.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.phone ?? "Swift member"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {members.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-xs font-bold text-primary"
            >
              {showAll ? "Show less" : `View all ${members.length} members`}
            </button>
          )}
        </section>

        <section className="mt-6 space-y-2 px-4">
          <Row icon={History} title="View member changes" subtitle="Joins, exits and role updates" />
          <Row icon={Star} title="Add to favourites" subtitle="Pin this group to the top" />
          <Row icon={ListPlus} title="Add to list" subtitle="Organise your chats" />
          <button
            type="button"
            onClick={onClearChat}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold text-destructive"
          >
            <Trash2 size={16} /> Clear chat
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold text-destructive"
          >
            <LogOut size={16} /> Exit group
          </button>
          <button
            type="button"
            onClick={() => toast.success("Report submitted. Thank you for keeping Swift safe.")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold text-destructive"
          >
            <Flag size={16} /> Report group
          </button>
        </section>
      </div>
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary"
      >
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-semibold text-foreground">{label}</span>
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Bell;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => toast(`${title} — coming soon`)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl text-primary"
        style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight size={16} className="text-muted-foreground" />
    </button>
  );
}
