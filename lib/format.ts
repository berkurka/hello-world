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

export function attendingLabel(value: number | null) {
  if (value === 1) return "Yes";
  if (value === 0) return "No";
  return "Pending";
}
