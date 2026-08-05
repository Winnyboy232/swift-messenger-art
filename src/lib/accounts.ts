const KEY = "swift.accounts.v1";

export interface StoredAccount {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  refreshToken: string;
  accessToken: string;
}

export function listAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

function save(accounts: StoredAccount[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export function rememberAccount(account: StoredAccount) {
  const rest = listAccounts().filter((a) => a.userId !== account.userId);
  save([account, ...rest]);
}

export function forgetAccount(userId: string) {
  save(listAccounts().filter((a) => a.userId !== userId));
}
