export const DEFAULT_DAILY_EMAIL_LIMIT = 100;

export class EmailQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailQuotaError";
  }
}

/** Resend's free plan allows 100 emails a day. `0` or `unlimited` turns the local cap off. */
export function dailyEmailLimit(env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = env.MAIL_DAILY_LIMIT?.trim() ?? "";
  if (!raw) return DEFAULT_DAILY_EMAIL_LIMIT;
  if (raw === "0" || raw.toLowerCase() === "unlimited") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_DAILY_EMAIL_LIMIT;
  return n;
}

export function utcDayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function budgetAllows(sentToday: number, additional: number, limit: number | null) {
  const count = Math.max(0, additional);
  if (limit === null) return { ok: true, remaining: null as number | null };
  const remaining = Math.max(0, limit - Math.max(0, sentToday));
  return { ok: count <= remaining, remaining };
}

export function dailyLimitMessage(limit: number, remaining: number | null) {
  const left =
    remaining === null
      ? ""
      : remaining === 0
        ? " None are left today."
        : ` ${remaining} ${remaining === 1 ? "is" : "are"} left today.`;
  return `Partyz stopped before going over today's limit of ${limit} emails.${left} Each address counts separately, including a family's second email. The free Resend plan allows 100 a day. Try again tomorrow, or set MAIL_DAILY_LIMIT after upgrading Resend.`;
}

/** Resend's daily quota, not a mailbox-full or per-second rate limit. */
export function isDailyQuotaError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("per second") || text.includes("testing emails")) return false;
  if (text.includes("mailbox") && text.includes("quota")) return false;
  return (
    (text.includes("daily") && (text.includes("quota") || text.includes("limit"))) ||
    text.includes("sending quota") ||
    text.includes("email quota")
  );
}
