import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "swift.settings.v1";

export type SettingsState = Record<string, boolean | string>;

export const DEFAULT_SETTINGS: SettingsState = {
  // Notifications
  "notify.privateChats": true,
  "notify.groups": true,
  "notify.channels": true,
  "notify.stories": true,
  "notify.reactions": true,
  "calls.vibrate": true,
  "calls.ringtone": "Swift Default",
  "badge.show": true,
  "badge.includeMuted": false,
  "badge.countMessages": true,
  "inapp.sounds": true,
  "inapp.vibrate": true,
  "inapp.preview": true,
  "inapp.chatSounds": true,
  "inapp.popOnScreen": false,
  "events.contactJoined": true,
  "events.pinnedMessages": true,
  "events.keepAlive": false,
  // Privacy
  "privacy.lastSeen": "Everyone",
  "privacy.readReceipts": true,
  "privacy.profilePhoto": "My contacts",
  "privacy.disappearing": false,
  // Security
  "security.twoStep": false,
  "security.appLock": false,
  "security.loginAlerts": true,
  // Chats
  "chats.enterToSend": true,
  "chats.mediaAutoSave": false,
  "chats.fontSize": "Medium",
  "chats.backup": true,
  // Appearance
  "appearance.theme": "Dark",
  "appearance.accent": "Electric blue",
  "appearance.reduceMotion": false,
  // Language
  "language.app": "English (US)",
  "language.aiReplies": "Match my language",
  // Storage
  "storage.autoDownloadPhotos": true,
  "storage.autoDownloadVideos": false,
  "storage.autoDownloadAudio": true,
  "storage.saveData": false,
};

function read(): SettingsState {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as SettingsState) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Local, device-scoped app preferences with instant persistence. */
export function useAppSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(read());
  }, []);

  const persist = useCallback((next: SettingsState) => {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const set = useCallback(
    (key: string, value: boolean | string) => {
      persist({ ...read(), [key]: value });
    },
    [persist],
  );

  const resetGroup = useCallback(
    (prefixes: string[]) => {
      const current = read();
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (prefixes.some((p) => key.startsWith(p))) current[key] = DEFAULT_SETTINGS[key]!;
      }
      persist(current);
    },
    [persist],
  );

  return { settings, set, resetGroup };
}
