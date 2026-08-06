import { useCallback, useEffect, useState } from "react";

const KEY = "swift.chats.v1";
const EVENT = "swift-chats-changed";

export interface ChatMember {
  id: string;
  name: string;
  initials: string;
  phone?: string;
}

export interface LocalChat {
  id: string;
  name: string;
  initials: string;
  isGroup: boolean;
  members: ChatMember[];
  avatar?: string | null;
  description?: string;
  createdAt: string;
}

export function listLocalChats(): LocalChat[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as LocalChat[];
  } catch {
    return [];
  }
}

function persist(chats: LocalChat[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(chats));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function saveLocalChat(chat: LocalChat) {
  const rest = listLocalChats().filter((c) => c.id !== chat.id);
  persist([chat, ...rest]);
}

export function removeLocalChat(id: string) {
  persist(listLocalChats().filter((c) => c.id !== id));
}

export function getLocalChat(id: string): LocalChat | null {
  return listLocalChats().find((c) => c.id === id) ?? null;
}

/** Reactive list of chats created on this device (groups + new DMs). */
export function useLocalChats() {
  const [chats, setChats] = useState<LocalChat[]>([]);
  const refresh = useCallback(() => setChats(listLocalChats()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { chats, refresh };
}

export function memberSummary(members: ChatMember[], max = 3): string {
  if (members.length === 0) return "No members yet";
  const shown = members.slice(0, max).map((m) => m.name.split(" ")[0]);
  const extra = members.length - shown.length;
  return extra > 0 ? `${shown.join(", ")}, +${extra}` : shown.join(", ");
}
