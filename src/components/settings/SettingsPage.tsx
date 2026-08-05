import { ArrowLeft, RotateCcw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/lib/appSettings";

export type SettingsPageKey =
  | "notifications"
  | "privacy"
  | "security"
  | "chats"
  | "appearance"
  | "language"
  | "storage"
  | "help"
  | "about";

interface ToggleItem {
  kind: "toggle";
  key: string;
  title: string;
  subtitle?: string;
}
interface SelectItem {
  kind: "select";
  key: string;
  title: string;
  options: string[];
}
interface NoteItem {
  kind: "note";
  title?: string;
  text: string;
}
type Item = ToggleItem | SelectItem | NoteItem;
interface Section {
  title: string;
  items: Item[];
}

const PAGES: Record<SettingsPageKey, { title: string; sections: Section[]; resetPrefixes?: string[] }> = {
  notifications: {
    title: "Notifications and Sounds",
    resetPrefixes: ["notify.", "calls.", "badge.", "inapp.", "events."],
    sections: [
      {
        title: "Notifications for chats",
        items: [
          { kind: "toggle", key: "notify.privateChats", title: "Private Chats", subtitle: "Alerts for direct messages" },
          { kind: "toggle", key: "notify.groups", title: "Groups", subtitle: "Alerts for group messages" },
          { kind: "toggle", key: "notify.channels", title: "Channels", subtitle: "Alerts for channel posts" },
          { kind: "toggle", key: "notify.stories", title: "Stories", subtitle: "New status updates" },
          { kind: "toggle", key: "notify.reactions", title: "Reactions", subtitle: "When someone reacts to you" },
        ],
      },
      {
        title: "Calls",
        items: [
          { kind: "toggle", key: "calls.vibrate", title: "Vibrate", subtitle: "Vibrate on incoming calls" },
          {
            kind: "select",
            key: "calls.ringtone",
            title: "Ringtone",
            options: ["Swift Default", "Pulse", "Aurora", "Classic", "Silent"],
          },
        ],
      },
      {
        title: "Badge counter",
        items: [
          { kind: "toggle", key: "badge.show", title: "Show Badge Icon" },
          { kind: "toggle", key: "badge.includeMuted", title: "Include Muted Chats" },
          { kind: "toggle", key: "badge.countMessages", title: "Count Unread Messages" },
        ],
      },
      {
        title: "In-app notifications",
        items: [
          { kind: "toggle", key: "inapp.sounds", title: "In-App Sounds" },
          { kind: "toggle", key: "inapp.vibrate", title: "In-App Vibrate" },
          { kind: "toggle", key: "inapp.preview", title: "In-App Preview" },
          { kind: "toggle", key: "inapp.chatSounds", title: "In-Chat Sounds" },
          { kind: "toggle", key: "inapp.popOnScreen", title: "Pop-on-Screen" },
        ],
      },
      {
        title: "Events & keep-alive",
        items: [
          { kind: "toggle", key: "events.contactJoined", title: "Contact Joined Swift" },
          { kind: "toggle", key: "events.pinnedMessages", title: "Pinned Messages" },
          {
            kind: "toggle",
            key: "events.keepAlive",
            title: "Background Keep-Alive",
            subtitle: "Keep a connection open for faster delivery",
          },
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    sections: [
      {
        title: "Who can see",
        items: [
          { kind: "select", key: "privacy.lastSeen", title: "Last Seen & Online", options: ["Everyone", "My contacts", "Nobody"] },
          { kind: "select", key: "privacy.profilePhoto", title: "Profile Photo", options: ["Everyone", "My contacts", "Nobody"] },
        ],
      },
      {
        title: "Messaging",
        items: [
          { kind: "toggle", key: "privacy.readReceipts", title: "Read Receipts" },
          { kind: "toggle", key: "privacy.disappearing", title: "Disappearing Messages", subtitle: "New chats delete after 7 days" },
          { kind: "note", text: "Blocked contacts are managed from each chat's three-dot menu." },
        ],
      },
    ],
  },
  security: {
    title: "Security",
    sections: [
      {
        title: "Account protection",
        items: [
          { kind: "toggle", key: "security.twoStep", title: "Two-Step Verification" },
          { kind: "toggle", key: "security.appLock", title: "App Lock", subtitle: "Require device unlock to open Swift" },
          { kind: "toggle", key: "security.loginAlerts", title: "Login Alerts" },
          { kind: "note", text: "Your conversations are stored securely in your private Swift cloud backup." },
        ],
      },
    ],
  },
  chats: {
    title: "Chats",
    sections: [
      {
        title: "Chat settings",
        items: [
          { kind: "toggle", key: "chats.enterToSend", title: "Enter is Send" },
          { kind: "toggle", key: "chats.mediaAutoSave", title: "Save Media to Gallery" },
          { kind: "select", key: "chats.fontSize", title: "Message Text Size", options: ["Small", "Medium", "Large"] },
          { kind: "toggle", key: "chats.backup", title: "Cloud Chat Backup" },
        ],
      },
    ],
  },
  appearance: {
    title: "Appearance",
    sections: [
      {
        title: "Theme",
        items: [
          { kind: "select", key: "appearance.theme", title: "Theme", options: ["Dark", "System"] },
          {
            kind: "select",
            key: "appearance.accent",
            title: "Accent Color",
            options: ["Electric blue", "Deep purple", "Aurora blend"],
          },
          { kind: "toggle", key: "appearance.reduceMotion", title: "Reduce Motion" },
        ],
      },
    ],
  },
  language: {
    title: "Language",
    sections: [
      {
        title: "Language",
        items: [
          {
            kind: "select",
            key: "language.app",
            title: "App Language",
            options: ["English (US)", "English (UK)", "Français", "Español", "Português", "العربية"],
          },
          {
            kind: "select",
            key: "language.aiReplies",
            title: "Swift AI Replies",
            options: ["Match my language", "Always English"],
          },
        ],
      },
    ],
  },
  storage: {
    title: "Storage & Data",
    sections: [
      {
        title: "Auto-download media",
        items: [
          { kind: "toggle", key: "storage.autoDownloadPhotos", title: "Photos" },
          { kind: "toggle", key: "storage.autoDownloadVideos", title: "Videos" },
          { kind: "toggle", key: "storage.autoDownloadAudio", title: "Voice Notes" },
          { kind: "toggle", key: "storage.saveData", title: "Data Saver", subtitle: "Lower quality uploads on mobile data" },
        ],
      },
    ],
  },
  help: {
    title: "Help & Support",
    sections: [
      {
        title: "Get help",
        items: [
          {
            kind: "note",
            title: "Ask Swift AI",
            text: "Swift AI Assistant can walk you through any feature or help you appeal an account freeze — it is pinned at the top of your chat list.",
          },
          { kind: "note", title: "Contact us", text: "Email support@swift.app and we'll reply within 24 hours." },
        ],
      },
    ],
  },
  about: {
    title: "About Swift",
    sections: [
      {
        title: "About",
        items: [
          {
            kind: "note",
            title: "Swift — Fast. Secure. Connected.",
            text: "Version 1.0.0. Built with Swift AI, premium plans, status updates and encrypted cloud backups.",
          },
        ],
      },
    ],
  },
};

export function SettingsPage({
  pageKey,
  onClose,
}: {
  pageKey: SettingsPageKey;
  onClose: () => void;
}) {
  const page = PAGES[pageKey];
  const { settings, set, resetGroup } = useAppSettings();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        className="flex items-center gap-3 border-b border-border px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-foreground">{page.title}</h2>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-4 pb-12">
        {page.sections.map((section) => (
          <section key={section.title} className="mb-5">
            <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {section.items.map((item, i) => (
                <div
                  key={item.kind === "note" ? `${section.title}-${i}` : item.key}
                  className={i !== section.items.length - 1 ? "border-b border-border/60" : ""}
                >
                  {item.kind === "toggle" && (
                    <Row title={item.title} subtitle={item.subtitle}>
                      <Switch
                        checked={settings[item.key] === true}
                        label={item.title}
                        onChange={(v) => set(item.key, v)}
                      />
                    </Row>
                  )}
                  {item.kind === "select" && (
                    <Row title={item.title}>
                      <select
                        aria-label={item.title}
                        value={String(settings[item.key] ?? item.options[0])}
                        onChange={(e) => set(item.key, e.target.value)}
                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                      >
                        {item.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Row>
                  )}
                  {item.kind === "note" && (
                    <div className="px-4 py-3.5">
                      {item.title && (
                        <p className="mb-1 text-sm font-semibold text-foreground">{item.title}</p>
                      )}
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {page.resetPrefixes && (
          <button
            type="button"
            onClick={() => {
              resetGroup(page.resetPrefixes!);
              toast.success("All notification settings reset to default");
            }}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-destructive"
          >
            <RotateCcw size={15} />
            Reset All Notifications
          </button>
        )}
      </div>
    </div>
  );
}

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full border border-border transition"
      style={checked ? { background: "var(--gradient-brand)", borderColor: "transparent" } : { background: "var(--muted, #222)" }}
    >
      <span
        className="absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white transition-all"
        style={{ height: 22, width: 22, left: checked ? 22 : 2 }}
      />
    </button>
  );
}

export type { LucideIcon };
