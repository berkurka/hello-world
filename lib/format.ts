export function formatWhen(startsAt: string) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return startsAt;
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function asBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function asCount(value: FormDataEntryValue | null) {
  const n = Number.parseInt(String(value ?? "0"), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, 99);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeStoredEmail(value: string | null | undefined) {
  const email = (value ?? "").trim().toLowerCase();
  return email || null;
}

export function attendingLabel(value: number | null) {
  if (value === 1) return "Yes";
  if (value === 2) return "Maybe";
  if (value === 0) return "No";
  return "Pending";
}

/** Yes and Maybe keep the guest counts. No and unanswered do not. */
export function storesHeadcount(attending: number) {
  return attending === 1 || attending === 2;
}

/** Dashboard totals and row counts use the same rule. Maybe counts only while it is allowed. */
export function headcountAttending(attending: number | null, allowMaybe: boolean) {
  if (attending === 1) return true;
  if (attending === 2 && allowMaybe) return true;
  return false;
}

export function parseAttending(raw: string, allowMaybe: boolean): 0 | 1 | 2 | null {
  if (raw === "yes") return 1;
  if (raw === "no") return 0;
  if (raw === "maybe" && allowMaybe) return 2;
  return null;
}
