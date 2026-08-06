/** Hard-coded owner identities that always receive lifetime Ultimate + admin access. */
export const OWNER_EMAILS = [
  "winnerikechukwu2022@gmail.com",
  "winnerikechukwu40@gmail.com",
];

export const OWNER_PHONES = [
  "+2348125522479",
  "+2347078863274",
  "07078863274",
  "2347078863274",
  "2348125522479",
  "08125522479",
];

function normalizePhone(phone: string) {
  return phone.replace(/[\s()-]/g, "");
}

/** True when the signed-in email or phone belongs to the Swift owner. */
export function isOwnerIdentity(email?: string | null, phone?: string | null): boolean {
  if (email && OWNER_EMAILS.includes(email.trim().toLowerCase())) return true;
  if (phone) {
    const p = normalizePhone(phone);
    if (OWNER_PHONES.some((o) => normalizePhone(o) === p)) return true;
    const tail = p.replace(/^(\+?234|0)/, "");
    if (tail && OWNER_PHONES.some((o) => normalizePhone(o).endsWith(tail) && tail.length >= 9))
      return true;
  }
  return false;
}
