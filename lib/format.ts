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

export const BABY_LABEL = "Babies (under 1)";

export type RsvpStatus = "going" | "maybe" | "declined" | "waiting";

/** Numeric RSVP values. 2 is Maybe, reserved for that feature. */
export function rsvpStatus(value: number | null | undefined): RsvpStatus {
  if (value === 1) return "going";
  if (value === 2) return "maybe";
  if (value === 0) return "declined";
  return "waiting";
}

export function rsvpStatusLabel(status: RsvpStatus) {
  if (status === "going") return "Going";
  if (status === "maybe") return "Maybe";
  if (status === "declined") return "Can't go";
  return "Waiting";
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

/** Locked family-invite confirmation. Solo guests use the personal heading instead. */
export function familyRsvpHeading(attending: number | null) {
  return `Your family already RSVP'd: ${attendingLabel(attending)}`;
}

export function partyHasPassed(startsAt: string, now = Date.now()) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now;
}

export function weekdayName(startsAt: string) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

export function formatPartyDate(startsAt: string) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return startsAt;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function formatInviteWhen(startsAt: string, endsAt?: string | null) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return startsAt;
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return `${date} · ${time}`;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return `${date} · ${time}`;
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}–${endTime}`;
}

export function formatInvitedAt(value: string | null) {
  if (!value) return "Not sent";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not sent";
  return `Invited ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function peopleLabel(count: number) {
  return count === 1 ? "1 person coming" : `${count} people coming`;
}

export function countSummary(
  event: { ask_adults: number; ask_kids: number; ask_infants: number },
  row: { adults: number | null; kids: number | null; infants: number | null },
) {
  const parts: string[] = [];
  const adults = row.adults ?? 0;
  const kids = row.kids ?? 0;
  const infants = row.infants ?? 0;
  if (event.ask_adults && adults > 0) parts.push(`${adults} ${adults === 1 ? "adult" : "adults"}`);
  if (event.ask_kids && kids > 0) parts.push(`${kids} ${kids === 1 ? "kid" : "kids"}`);
  if (event.ask_infants && infants > 0) parts.push(`${infants} ${infants === 1 ? "baby" : "babies"}`);
  return parts.join(" · ");
}

export function formatReminded(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  return `Reminded ${label}`;
}
