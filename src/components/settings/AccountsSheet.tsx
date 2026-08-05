import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { forgetAccount, listAccounts, type StoredAccount } from "@/lib/accounts";

export function AccountsSheet({
  open,
  onClose,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
}) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (open) setAccounts(listAccounts());
  }, [open]);

  if (!open) return null;

  const switchTo = async (account: StoredAccount) => {
    if (account.userId === currentUserId) return;
    setSwitching(account.userId);
    const { error } = await supabase.auth.setSession({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });
    setSwitching(null);
    if (error) {
      toast.error("Session expired — please sign in to this account again");
      forgetAccount(account.userId);
      setAccounts(listAccounts());
      return;
    }
    toast.success(`Switched to ${account.name}`);
    onClose();
    navigate({ to: "/", replace: true });
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t border-border bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Accounts</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {accounts.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              No other accounts saved on this device yet.
            </p>
          )}
          {accounts.map((a) => {
            const isCurrent = a.userId === currentUserId;
            return (
              <div
                key={a.userId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <button
                  type="button"
                  onClick={() => void switchTo(a)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {a.avatarUrl ? (
                      <img src={a.avatarUrl} alt={a.name} className="h-full w-full object-cover" />
                    ) : (
                      a.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {a.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                  </span>
                  {switching === a.userId ? (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  ) : isCurrent ? (
                    <Check size={16} className="text-primary" />
                  ) : null}
                </button>
                {!isCurrent && (
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => {
                      forgetAccount(a.userId);
                      setAccounts(listAccounts());
                    }}
                    className="text-muted-foreground"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate({ to: "/auth", search: { add: true } });
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={17} /> Add Another Account
        </button>
      </div>
    </div>
  );
}
