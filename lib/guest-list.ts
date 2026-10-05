import { inviteRecipients } from "./invite-delivery";
import { formatWhen, normalizeStoredEmail } from "./format";

export const SHARE_JOIN_LIMIT = 30;
/** Stops one party link from being flooded from many addresses at once. */
export const SHARE_JOIN_EVENT_LIMIT = 100;
export const SHARE_JOIN_WINDOW_MS = 60 * 60 * 1000;
export const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const GUEST_MESSAGE_MAX = 4000;

export const GUEST_EXPORT_HEADERS = [
  "name",
  "email",
  "email2",
  "status",
  "adults",
  "kids",
  "infants",
  "comment",
] as const;

export type GuestAudience = "everyone" | "going" | "waiting";

export type GuestExportRow = {
  display_name: string;
  email: string;
  email2: string | null;
  attending: number | null;
  adults: number | null;
  kids: number | null;
  infants: number | null;
  comment: string | null;
};

export function shareReturnCookie(eventId: string) {
  return `partyz_p_${eventId}`;
}

export function requestIp(headerValue: string | null) {
  const ip = (headerValue ?? "").split(",")[0]?.trim() ?? "";
  if (!ip) return "unknown";
  return ip.slice(0, 64);
}

export function guestStatusLabel(attending: number | null) {
  if (attending === 1) return "Yes";
  if (attending === 0) return "No";
  if (attending === 2) return "Maybe";
  return "Pending";
}

export function matchesAudience(attending: number | null, audience: GuestAudience) {
  if (audience === "everyone") return true;
  if (audience === "going") return attending === 1;
  return attending === null || attending === 2;
}

export function parseAudience(value: string): GuestAudience | null {
  if (value === "everyone" || value === "going" || value === "waiting") return value;
  return null;
}

export function recipientCount(
  invitees: { email: string; email2?: string | null; attending: number | null }[],
  audience: GuestAudience,
) {
  return invitees
    .filter((row) => matchesAudience(row.attending, audience))
    .reduce((sum, row) => sum + inviteRecipients(row).length, 0);
}

export function bulkMailBlocked(
  row: {
    attending: number | null;
    email_opt_out?: number | null;
    joined_via?: string | null;
  },
  audience?: GuestAudience,
) {
  if (Number(row.email_opt_out) === 1) return true;
  if (row.joined_via === "link" && row.attending === null) return true;
  // A link guest typed their own address. Everyone and Going wait until that address is confirmed.
  if (row.joined_via === "link" && (audience === "everyone" || audience === "going")) return true;
  return false;
}

export function remindedRecently(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return now - then < REMINDER_COOLDOWN_MS;
}

export function reachableGuests<
  T extends {
    email: string;
    email2?: string | null;
    attending: number | null;
    email_opt_out?: number | null;
    joined_via?: string | null;
  },
>(invitees: T[], audience: GuestAudience) {
  return invitees.filter(
    (row) =>
      matchesAudience(row.attending, audience) &&
      inviteRecipients(row).length > 0 &&
      !bulkMailBlocked(row, audience),
  );
}

const CSV_FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: string) {
  const text = CSV_FORMULA.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function guestsToCsv(rows: GuestExportRow[]) {
  const lines = [GUEST_EXPORT_HEADERS.join(",")];
  for (const row of rows) {
    const yes = row.attending === 1;
    lines.push(
      [
        row.display_name,
        normalizeStoredEmail(row.email) ?? "",
        normalizeStoredEmail(row.email2) ?? "",
        guestStatusLabel(row.attending),
        yes ? String(row.adults ?? 0) : "",
        yes ? String(row.kids ?? 0) : "",
        yes ? String(row.infants ?? 0) : "",
        row.comment ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}\n`;
}

export function parseShareCap(raw: string): { cap: number | null } | { error: string } {
  const text = raw.trim();
  if (!text) return { cap: null };
  if (!/^\d+$/.test(text)) {
    return { error: "Sign-up cap should be a whole number, or left blank." };
  }
  const n = Number(text);
  if (n < 1 || n > 5000) {
    return { error: "Sign-up cap should be between 1 and 5000, or left blank for no cap." };
  }
  return { cap: n };
}

export function shareSignupsOpen(opts: { enabled: boolean; cap: number | null; joined: number }) {
  if (!opts.enabled) return { open: false as const, reason: "closed" as const };
  if (opts.cap !== null && opts.joined >= opts.cap) return { open: false as const, reason: "full" as const };
  return { open: true as const, reason: null };
}

export type PartyChange = { label: "When" | "Place"; from: string; to: string };

export function describePartyChanges(
  before: { starts_at: string; location: string; ends_at?: string | null },
  after: { starts_at: string; location: string; ends_at?: string | null },
  format: (startsAt: string, endsAt?: string | null) => string = (startsAt) => formatWhen(startsAt),
): PartyChange[] {
  const changes: PartyChange[] = [];
  const whenChanged =
    before.starts_at !== after.starts_at || (before.ends_at ?? "") !== (after.ends_at ?? "");
  if (whenChanged) {
    changes.push({
      label: "When",
      from: format(before.starts_at, before.ends_at),
      to: format(after.starts_at, after.ends_at),
    });
  }
  const fromPlace = before.location.trim();
  const toPlace = after.location.trim();
  if (fromPlace !== toPlace) {
    changes.push({ label: "Place", from: fromPlace || "—", to: toPlace || "—" });
  }
  return changes;
}

export function mailSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);
}

export function guestEmailNotice(opts: {
  verb: string;
  sentGuests: number;
  failed: string[];
  error?: string;
}) {
  if (opts.sentGuests === 0) {
    if (opts.error) return opts.error;
    if (opts.failed.length > 0) return `Could not email ${opts.failed.join(", ")}.`;
    return "No guests to email.";
  }
  const sent = `${opts.verb} ${opts.sentGuests} ${opts.sentGuests === 1 ? "guest" : "guests"}.`;
  const parts = [sent];
  if (opts.failed.length > 0) parts.push(`Could not email ${opts.failed.join(", ")}.`);
  if (opts.error) parts.push(opts.error);
  return parts.join(" ");
}

export function withinRateLimit(attempts: number, limit = SHARE_JOIN_LIMIT) {
  return attempts < limit;
}
