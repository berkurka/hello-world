import { headcount, peopleComing } from "./party-stats";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseGuestCap(raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d{1,4}$/.test(text)) return "invalid";
  const n = Number(text);
  if (n < 1) return "invalid";
  return n;
}

export function parseRsvpDeadline(raw: string): string | null | "invalid" {
  const text = raw.trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return "invalid";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return "invalid";
  }
  return `${text}T23:59`;
}

export function readGuestCap(value: number | null | undefined) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function readDeadline(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || null;
}

export function deadlineHasPassed(deadline: string | null, now = Date.now()) {
  if (!deadline) return false;
  const time = Date.parse(deadline);
  if (Number.isNaN(time)) return false;
  return time <= now;
}

export function partyIsCancelled(cancelledAt: string | null | undefined) {
  return Boolean(cancelledAt?.trim());
}

export function isUndecided(attending: number | null | undefined) {
  return attending == null || attending === 2;
}

export function formatRsvpDeadline(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function deadlineOpenMessage(deadline: string) {
  return `Please reply by ${formatRsvpDeadline(deadline)}.`;
}

export function deadlineClosedMessage(deadline: string) {
  return `RSVPs closed on ${formatRsvpDeadline(deadline)}.`;
}

export function cancelledMessage(hostName: string) {
  const host = hostName.trim() || "The host";
  return `${host} cancelled this party. Replies are closed.`;
}

export function partyFullMessage(cap: number, allowMaybe: boolean) {
  const people = cap === 1 ? "1 person" : `${cap} people`;
  const alt = allowMaybe ? "You can still say maybe or can't go." : "You can still say you can't go.";
  return `This party is full (${people}). ${alt}`;
}

export function spotsLeftMessage(remaining: number) {
  if (remaining === 1) return "Room for 1 more person.";
  return `Room for ${remaining} more people.`;
}

type CountEvent = {
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
};

type CountRow = {
  invitee_id?: string;
  attending: number | null;
  adults: number | null;
  kids: number | null;
  infants: number | null;
};

/** People already going, excluding one guest so their new answer can replace the old one. */
export function othersGoing(event: CountEvent, rows: CountRow[], inviteeId: string) {
  return peopleComing(
    event,
    rows.filter((row) => row.invitee_id !== inviteeId),
    false,
  );
}

export function goingPartySize(event: CountEvent, adults: number, kids: number, infants: number) {
  return headcount(event, { attending: 1, adults, kids, infants }, false);
}

/** A positive cap blocks a Going reply that would pass it. Maybe and no never count. */
export function goingFitsCap(cap: number | null, others: number, nextGoing: number) {
  if (cap == null || nextGoing <= 0) return true;
  return others + nextGoing <= cap;
}

export function capRemaining(cap: number | null, others: number) {
  if (cap == null) return null;
  return Math.max(0, cap - others);
}
