import { ArrowLeft, MessageCircle, BellOff, Phone, Video, Link2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface LinkItem {
  id: string;
  url: string;
  time: string;
}

interface Props {
  name: string;
  initials: string;
  phone?: string | null;
  links: LinkItem[];
  onClose: () => void;
  onCall: (kind: "audio" | "video") => void;
}

/** 1-on-1 profile screen shown when tapping a contact's name in a DM. */
export function ContactInfo({ name, initials, phone, links, onClose, onCall }: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-md pb-16">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-3 backdrop-blur-xl">
          <button type="button" aria-label="Back" onClick={onClose} className="text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[15px] font-bold text-foreground">Contact info</h2>
        </header>

        <div className="flex flex-col items-center px-4 pt-6">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            {initials}
          </div>
          <h3 className="mt-3 text-xl font-bold text-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground">last seen a long time ago</p>

          <div className="mt-5 grid w-full grid-cols-4 gap-2">
            <Action icon={MessageCircle} label="Message" onClick={onClose} />
            <Action icon={BellOff} label="Mute" onClick={() => toast.success("Notifications muted")} />
            <Action icon={Phone} label="Call" onClick={() => onCall("audio")} />
            <Action icon={Video} label="Video" onClick={() => onCall("video")} />
          </div>
        </div>

        <section className="mt-6 px-4">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{phone || "Phone number hidden"}</p>
            <p className="text-xs text-muted-foreground">Mobile</p>
          </div>
        </section>

        <section className="mt-6 px-4">
          <p className="mb-2 text-sm font-bold text-foreground">Links</p>
          {links.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
              Links shared in this chat will show up here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-0"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-primary"
                    style={{ background: "color-mix(in oklab, var(--swift-purple) 22%, transparent)" }}
                  >
                    <Link2 size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{l.url}</span>
                    <span className="block text-[11px] text-muted-foreground">{l.time}</span>
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
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
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary">
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-semibold text-foreground">{label}</span>
    </button>
  );
}
