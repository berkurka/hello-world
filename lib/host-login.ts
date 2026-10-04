import { createHash } from "crypto";
import { getEvent, getEventForOrganizer, query, queryOne, run } from "./db";
import { normalizeStoredEmail } from "./format";
import { newId, newToken } from "./ids";
import type { EventRow } from "./types";

export const SESSION_COOKIE = "partyz_host";
export const DEVICE_COOKIE = "partyz_device";

export const LOGIN_TTL_MS = 30 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const DEVICE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const LOGIN_WINDOW_MS = 60 * 60 * 1000;
export const LOGIN_EMAIL_LIMIT = 3;
export const LOGIN_IP_LIMIT = 10;
export const EMAIL_CHANGE_LIMIT = 3;

export const RECOVER_SENT_MESSAGE =
  "If that email has parties on Partyz, we sent a sign-in link. It expires in 30 minutes.";

export type HostAccess = "token" | "session" | "device";

export type HostParty = EventRow & { yes_count: number; people: number };

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function withinLoginLimits(emailCount: number, ipCount: number) {
  return emailCount < LOGIN_EMAIL_LIMIT && ipCount < LOGIN_IP_LIMIT;
}

export function clientIpFromHeaders(h: { get(name: string): string | null }) {
  const forwarded = h.get("x-forwarded-for");
  const raw = (forwarded?.split(",")[0] || h.get("x-real-ip") || "").trim();
  const cleaned = raw.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 64);
  return cleaned || "unknown";
}

export function splitByStart<T extends { starts_at: string }>(events: T[], now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    if (event.starts_at >= key) upcoming.push(event);
    else past.push(event);
  }
  return { upcoming, past: past.reverse() };
}

async function countOf(sql: string, args: (string | number | null)[]) {
  const row = await queryOne<{ n: number }>(sql, args);
  return Number(row?.n ?? 0);
}

export async function createLoginToken(email: string, purpose: "login" | "create", ip: string) {
  const token = newToken();
  const now = new Date();
  await run(
    `INSERT INTO host_login_tokens (id, email, token_hash, expires_at, used_at, created_at, request_ip, purpose)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      newId(),
      email,
      hashToken(token),
      new Date(now.getTime() + LOGIN_TTL_MS).toISOString(),
      now.toISOString(),
      ip,
      purpose,
    ],
  );
  return token;
}

export type LoginIssue =
  | { status: "sent"; token: string; titles: string[] }
  | { status: "skipped" }
  | { status: "limited" };

export async function issueHostLogin(email: string, ip: string): Promise<LoginIssue> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const emailCount = await countOf(
    `SELECT COUNT(*) AS n FROM host_login_tokens WHERE email = ? AND purpose = 'login' AND created_at >= ?`,
    [email, since],
  );
  const ipCount = await countOf(
    `SELECT COUNT(*) AS n FROM host_login_tokens WHERE request_ip = ? AND purpose = 'login' AND created_at >= ?`,
    [ip, since],
  );
  if (!withinLoginLimits(emailCount, ipCount)) return { status: "limited" };
  const events = await listEventsForHost(email);
  const token = await createLoginToken(email, "login", ip);
  if (events.length === 0) return { status: "skipped" };
  return { status: "sent", token, titles: events.map((event) => event.title) };
}

type TokenRow = {
  id: string;
  email: string;
  expires_at: string;
  used_at: string | null;
};

async function openLoginRow(rawToken: string) {
  if (!rawToken) return null;
  const row = await queryOne<TokenRow>(
    `SELECT id, email, expires_at, used_at FROM host_login_tokens WHERE token_hash = ?`,
    [hashToken(rawToken)],
  );
  if (!row || row.used_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function peekLoginToken(rawToken: string) {
  const row = await openLoginRow(rawToken);
  return row?.email ?? null;
}

export async function redeemHostLogin(rawToken: string) {
  const row = await openLoginRow(rawToken);
  if (!row) return null;
  const now = new Date().toISOString();
  const result = await run(
    `UPDATE host_login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL`,
    [now, row.id],
  );
  if (Number(result.rowsAffected) !== 1) return null;
  return row.email;
}

export async function startSession(email: string) {
  const token = newToken();
  const now = new Date();
  await run(
    `INSERT INTO host_sessions (id, email, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      newId(),
      email,
      hashToken(token),
      new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      now.toISOString(),
    ],
  );
  return token;
}

export async function sessionEmailFromToken(rawToken: string | null) {
  if (!rawToken) return null;
  const row = await queryOne<{ email: string; expires_at: string }>(
    `SELECT email, expires_at FROM host_sessions WHERE token_hash = ?`,
    [hashToken(rawToken)],
  );
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return row.email;
}

export async function deleteSession(rawToken: string | null) {
  if (!rawToken) return;
  await run(`DELETE FROM host_sessions WHERE token_hash = ?`, [hashToken(rawToken)]);
}

export function listEventsForHost(email: string) {
  return query<EventRow>(`SELECT * FROM events WHERE host_email = ? ORDER BY starts_at ASC`, [email]);
}

export function listHostParties(email: string) {
  return query<HostParty>(
    `SELECT e.*,
            COALESCE(SUM(CASE WHEN r.attending = 1 THEN 1 ELSE 0 END), 0) AS yes_count,
            COALESCE(SUM(CASE WHEN r.attending = 1 THEN
              COALESCE(r.adults, 0) + COALESCE(r.kids, 0) + COALESCE(r.infants, 0)
              ELSE 0 END), 0) AS people
     FROM events e
     LEFT JOIN invitees i ON i.event_id = e.id
     LEFT JOIN rsvps r ON r.invitee_id = i.id
     WHERE e.host_email = ?
     GROUP BY e.id
     ORDER BY e.starts_at ASC`,
    [email],
  );
}

export async function grantDevice(eventId: string, rawToken: string) {
  const hash = hashToken(rawToken);
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM host_device_grants WHERE event_id = ? AND token_hash = ?`,
    [eventId, hash],
  );
  if (existing) return;
  await run(
    `INSERT INTO host_device_grants (id, event_id, token_hash, created_at) VALUES (?, ?, ?, ?)`,
    [newId(), eventId, hash, new Date().toISOString()],
  );
}

export async function deviceAllows(eventId: string, rawToken: string | null) {
  if (!rawToken) return false;
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM host_device_grants WHERE event_id = ? AND token_hash = ?`,
    [eventId, hashToken(rawToken)],
  );
  return Boolean(row);
}

export async function authorizeOrganizer(
  eventId: string,
  urlToken: string | null,
  creds: { sessionToken: string | null; deviceToken: string | null },
): Promise<{ event: EventRow; access: HostAccess } | null> {
  if (!eventId) return null;
  if (urlToken) {
    const byToken = await getEventForOrganizer(eventId, urlToken);
    if (byToken) return { event: byToken, access: "token" };
  }
  const event = await getEvent(eventId);
  if (!event) return null;
  const email = await sessionEmailFromToken(creds.sessionToken);
  const hostEmail = normalizeStoredEmail(event.host_email);
  if (email && hostEmail && email === hostEmail) return { event, access: "session" };
  if (await deviceAllows(event.id, creds.deviceToken)) return { event, access: "device" };
  return null;
}

export async function rotateDashboardSecrets(eventId: string) {
  const adminToken = newToken();
  const claimToken = newToken();
  const result = await run(
    `UPDATE events SET admin_token = ?, host_claim_token = ?, host_claimed_at = NULL WHERE id = ?`,
    [adminToken, claimToken, eventId],
  );
  if (Number(result.rowsAffected) !== 1) return null;
  return adminToken;
}

export async function issueEmailChange(eventId: string, newEmail: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const recent = await countOf(
    `SELECT COUNT(*) AS n FROM host_email_changes WHERE event_id = ? AND created_at >= ?`,
    [eventId, since],
  );
  if (recent >= EMAIL_CHANGE_LIMIT) {
    return { ok: false as const, error: "Too many confirmation emails. Try again in an hour." };
  }
  const token = newToken();
  const now = new Date();
  await run(
    `INSERT INTO host_email_changes (id, event_id, new_email, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    [
      newId(),
      eventId,
      newEmail,
      hashToken(token),
      new Date(now.getTime() + LOGIN_TTL_MS).toISOString(),
      now.toISOString(),
    ],
  );
  return { ok: true as const, token };
}

type EmailChangeRow = {
  id: string;
  event_id: string;
  new_email: string;
  expires_at: string;
  used_at: string | null;
};

async function openEmailChange(rawToken: string) {
  if (!rawToken) return null;
  const row = await queryOne<EmailChangeRow>(
    `SELECT id, event_id, new_email, expires_at, used_at FROM host_email_changes WHERE token_hash = ?`,
    [hashToken(rawToken)],
  );
  if (!row || row.used_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function peekEmailChange(rawToken: string) {
  const row = await openEmailChange(rawToken);
  if (!row) return null;
  const event = await getEvent(row.event_id);
  if (!event) return null;
  return { email: row.new_email, eventId: event.id, title: event.title };
}

export async function redeemEmailChange(rawToken: string) {
  const row = await openEmailChange(rawToken);
  if (!row) return null;
  const now = new Date().toISOString();
  const marked = await run(
    `UPDATE host_email_changes SET used_at = ? WHERE id = ? AND used_at IS NULL`,
    [now, row.id],
  );
  if (Number(marked.rowsAffected) !== 1) return null;
  const updated = await run(`UPDATE events SET host_email = ? WHERE id = ?`, [row.new_email, row.event_id]);
  if (Number(updated.rowsAffected) !== 1) return null;
  return { eventId: row.event_id, email: row.new_email };
}
