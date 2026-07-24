import { useEffect, useState } from "react";
import { X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Viewer {
  viewer_id: string;
  created_at: string;
  display_name?: string | null;
}

interface StatusViewersSheetProps {
  updateId: string;
  onClose: () => void;
}

export function StatusViewersSheet({ updateId, onClose }: StatusViewersSheetProps) {
  const [viewers, setViewers] = useState<Viewer[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("update_views")
        .select("viewer_id, created_at")
        .eq("update_id", updateId)
        .order("created_at", { ascending: false });
      setViewers((data ?? []) as Viewer[]);
    })();
  }, [updateId]);

  return (
    <div className="fixed inset-0 z-[95] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Dismiss" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-border bg-background p-4 text-foreground"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-muted-foreground" />
            <h3 className="text-base font-semibold">Viewers</h3>
            {viewers && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                {viewers.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {viewers === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
        ) : viewers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No views yet</p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
            {viewers.map((v) => {
              const initials = v.viewer_id.slice(0, 2).toUpperCase();
              const label = `User ${v.viewer_id.slice(0, 6)}`;
              const when = new Date(v.created_at).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              });
              return (
                <li key={v.viewer_id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{when}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
