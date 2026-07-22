import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const placeholderChats = [
  { id: "ava-chen", name: "Ava Chen", preview: "See you tomorrow ✨", time: "09:42", unread: 2, initials: "AC" },
  { id: "marcus-rivera", name: "Marcus Rivera", preview: "Sent a photo", time: "08:15", unread: 0, initials: "MR" },
  { id: "design-team", name: "Design Team", preview: "Nadia: pushed the update", time: "Yesterday", unread: 5, initials: "DT" },
  { id: "priya-patel", name: "Priya Patel", preview: "Thanks!", time: "Yesterday", unread: 0, initials: "PP" },
  { id: "weekend-trip", name: "Weekend Trip", preview: "Leo: what time again?", time: "Mon", unread: 0, initials: "WT" },
  { id: "jonas-meyer", name: "Jonas Meyer", preview: "🙌", time: "Mon", unread: 0, initials: "JM" },
];

export function ChatsTab() {
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Chats</h2>
        <div className="mt-3 flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
          <Search size={16} className="text-muted-foreground" strokeWidth={2.2} />
          <input
            type="search"
            placeholder="Search"
            className="h-full flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>
      <ul className="divide-y divide-border">
        {placeholderChats.map((chat) => (
          <li key={chat.id}>
            <Link
              to="/chat/$chatId"
              params={{ chatId: chat.id }}
              search={{ name: chat.name, initials: chat.initials }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-card/60 active:bg-card"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                {chat.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-foreground">{chat.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-muted-foreground">{chat.preview}</p>
                  {chat.unread > 0 && (
                    <span
                      className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
