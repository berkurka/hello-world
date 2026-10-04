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
  const vercel = h.get("x-vercel-forwarded-for");
  const forwarded = h.get("x-forwarded-for");
  const raw = (vercel?.split(",")[0] || forwarded?.split(",")[0] || h.get("x-real-ip") || "").trim();
  const cleaned = raw.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 64);
  return cleaned || "unknown";
}

export function canChangeHostEmail(
  sessionEmail: string | null,
  hostEmail: string | null,
  nextEmail?: string | null,
) {
  const session = normalizeStoredEmail(sessionEmail);
  if (!session) return false;
  const host = normalizeStoredEmail(hostEmail);
  if (!host) {
    if (nextEmail === undefined) return true;
    return normalizeStoredEmail(nextEmail) === session;
  }
  return session === host;
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

export async function pruneExpiredHostRows(now = new Date()) {
  const cutoff = new Date(now.getTime() - LOGIN_WINDOW_MS).toISOString();
  const instant = now.toISOString();
  await run(`DELETE FROM host_login_tokens WHERE created_at < ?`, [cutoff]);
  await run(`DELETE FROM host_email_changes WHERE created_at < ?`, [cutoff]);
  await run(`DELETE FROM host_sessions WHERE expires_at <= ?`, [instant]);
  await run(`DELETE FROM host_device_grants WHERE expires_at IS NOT NULL AND expires_at <= ?`, [instant]);
}

export type IssuedToken = { status: "issued"; token: string } | { status: "limited" };

export async function issueLoginToken(
  email: string,
  purpose: "login" | "create",
  ip: string,
): Promise<IssuedToken> {
  await pruneExpiredHostRows();
  const token = newToken();
  const now = new Date();
  const since = new Date(now.getTime() - LOGIN_WINDOW_MS).toISOString();
  const hash = hashToken(token);
  const inserted = await run(
    `INSERT INTO host_login_tokens (id, email, token_hash, expires_at, used_at, created_at, request_ip, purpose)
     SELECT ?, ?, ?, ?, NULL, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM host_login_tokens WHERE email = ? AND created_at >= ?) < ?
       AND (SELECT COUNT(*) FROM host_login_tokens WHERE request_ip = ? AND created_at >= ?) < ?`,
    [
      newId(),
      email,
      hash,
      new Date(now.getTime() + LOGIN_TTL_MS).toISOString(),
      now.toISOString(),
      ip,
      purpose,
      email,
      since,
      LOGIN_EMAIL_LIMIT,
      ip,
      since,
      LOGIN_IP_LIMIT,
    ],
  );
  if (Number(inserted.rowsAffected) !== 1) return { status: "limited" };
  await run(
    `UPDATE host_login_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL AND token_hash != ?`,
    [now.toISOString(), email, hash],
  );
  return { status: "issued", token };
}

export type LoginIssue =
  | { status: "sent"; token: string; titles: string[] }
  | { status: "skipped" }
  | { status: "limited" };

export async function issueHostLogin(email: string, ip: string): Promise<LoginIssue> {
  const events = await listEventsForHost(email);
  const issued = await issueLoginToken(email, "login", ip);
  if (issued.status === "limited") return { status: "limited" };
  if (events.length === 0) return { status: "skipped" };
  return { status: "sent", token: issued.token, titles: events.map((event) => event.title) };
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
  await run(
    `UPDATE events SET host_email_verified_at = ? WHERE lower(host_email) = lower(?) AND host_email_verified_at IS NULL`,
    [now, row.email],
  );
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
  return query<EventRow>(
    `SELECT * FROM events WHERE lower(host_email) = lower(?) ORDER BY starts_at ASC`,
    [email],
  );
}

export function listHostParties(email: string) {
  return query<HostParty>(
    `SELECT e.*,
            COALESCE(SUM(CASE WHEN r.attending = 1 THEN 1 ELSE 0 END), 0) AS yes_count,
            COALESCE(SUM(CASE WHEN r.attending = 1 OR (r.attending = 2 AND e.allow_maybe != 0) THEN
              COALESCE(r.adults, 0) + COALESCE(r.kids, 0) + COALESCE(r.infants, 0)
              ELSE 0 END), 0) AS people
     FROM events e
     LEFT JOIN invitees i ON i.event_id = e.id
     LEFT JOIN rsvps r ON r.invitee_id = i.id
     WHERE lower(e.host_email) = lower(?)
     GROUP BY e.id
     ORDER BY e.starts_at ASC`,
    [email],
  );
}

function deviceExpiry(now = new Date()) {
  return new Date(now.getTime() + DEVICE_MAX_AGE_SECONDS * 1000).toISOString();
}

export async function grantDevice(eventId: string, rawToken: string) {
  const hash = hashToken(rawToken);
  const expiresAt = deviceExpiry();
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM host_device_grants WHERE event_id = ? AND token_hash = ?`,
    [eventId, hash],
  );
  if (existing) {
    await run(`UPDATE host_device_grants SET expires_at = ? WHERE id = ?`, [expiresAt, existing.id]);
    return;
  }
  await run(
    `INSERT INTO host_device_grants (id, event_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [newId(), eventId, hash, new Date().toISOString(), expiresAt],
  );
}

export async function deviceAllows(eventId: string, rawToken: string | null) {
  if (!rawToken) return false;
  const row = await queryOne<{ expires_at: string | null }>(
    `SELECT expires_at FROM host_device_grants WHERE event_id = ? AND token_hash = ?`,
    [eventId, hashToken(rawToken)],
  );
  if (!row?.expires_at) return false;
  return Date.parse(row.expires_at) > Date.now();
}

export async function revokeDeviceGrantsForEvent(eventId: string) {
  await run(`DELETE FROM host_device_grants WHERE event_id = ?`, [eventId]);
}

export async function revokeDeviceToken(rawToken: string | null) {
  if (!rawToken) return;
  await run(`DELETE FROM host_device_grants WHERE token_hash = ?`, [hashToken(rawToken)]);
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

async function retireEmailChanges(eventId: string, now: string, exceptId: string | null = null) {
  if (exceptId) {
    await run(
      `UPDATE host_email_changes SET used_at = ? WHERE event_id = ? AND used_at IS NULL AND id != ?`,
      [now, eventId, exceptId],
    );
    return;
  }
  await run(`UPDATE host_email_changes SET used_at = ? WHERE event_id = ? AND used_at IS NULL`, [now, eventId]);
}

export async function rotateDashboardSecrets(eventId: string) {
  const adminToken = newToken();
  const claimToken = newToken();
  const now = new Date().toISOString();
  const result = await run(
    `UPDATE events SET admin_token = ?, host_claim_token = ?, host_claimed_at = NULL WHERE id = ?`,
    [adminToken, claimToken, eventId],
  );
  if (Number(result.rowsAffected) !== 1) return null;
  await retireEmailChanges(eventId, now);
  await revokeDeviceGrantsForEvent(eventId);
  return adminToken;
}

export async function issueEmailChange(eventId: string, newEmail: string, previousEmail: string | null) {
  await pruneExpiredHostRows();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const recent = await countOf(
    `SELECT COUNT(*) AS n FROM host_email_changes WHERE event_id = ? AND created_at >= ?`,
    [eventId, since],
  );
  if (recent >= EMAIL_CHANGE_LIMIT) {
    return { ok: false as const, error: "Too many confirmation emails. Try again in an hour." };
  }
  const now = new Date();
  const nowIso = now.toISOString();
  await retireEmailChanges(eventId, nowIso);
  const token = newToken();
  await run(
    `INSERT INTO host_email_changes (
      id, event_id, new_email, previous_email, token_hash, expires_at, used_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      newId(),
      eventId,
      newEmail,
      normalizeStoredEmail(previousEmail),
      hashToken(token),
      new Date(now.getTime() + LOGIN_TTL_MS).toISOString(),
      nowIso,
    ],
  );
  return { ok: true as const, token };
}

export async function attachHostEmail(eventId: string, email: string) {
  const normalized = normalizeStoredEmail(email);
  if (!normalized) return false;
  const updated = await run(
    `UPDATE events SET host_email = ?, host_email_verified_at = ?
     WHERE id = ? AND (host_email IS NULL OR trim(host_email) = '')`,
    [normalized, new Date().toISOString(), eventId],
  );
  return Number(updated.rowsAffected) === 1;
}

export async function revokeEmailChangeToken(rawToken: string) {
  if (!rawToken) return;
  await run(`UPDATE host_email_changes SET used_at = ? WHERE token_hash = ? AND used_at IS NULL`, [
    new Date().toISOString(),
    hashToken(rawToken),
  ]);
}

type EmailChangeRow = {
  id: string;
  event_id: string;
  new_email: string;
  previous_email: string | null;
  expires_at: string;
  used_at: string | null;
};

async function openEmailChange(rawToken: string) {
  if (!rawToken) return null;
  const row = await queryOne<EmailChangeRow>(
    `SELECT id, event_id, new_email, previous_email, expires_at, used_at
     FROM host_email_changes WHERE token_hash = ?`,
    [hashToken(rawToken)],
  );
  if (!row || row.used_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

function hostEmailMatches(current: string | null, previous: string | null) {
  return normalizeStoredEmail(current) === normalizeStoredEmail(previous);
}

export async function peekEmailChange(rawToken: string) {
  const row = await openEmailChange(rawToken);
  if (!row) return null;
  const event = await getEvent(row.event_id);
  if (!event || !hostEmailMatches(event.host_email, row.previous_email)) return null;
  return { email: row.new_email, eventId: event.id, title: event.title };
}

export async function redeemEmailChange(rawToken: string) {
  const row = await openEmailChange(rawToken);
  if (!row) return null;
  const event = await getEvent(row.event_id);
  const now = new Date().toISOString();
  const marked = await run(
    `UPDATE host_email_changes SET used_at = ? WHERE id = ? AND used_at IS NULL`,
    [now, row.id],
  );
  if (Number(marked.rowsAffected) !== 1) return null;
  await retireEmailChanges(row.event_id, now, row.id);
  if (!event || !hostEmailMatches(event.host_email, row.previous_email)) return null;
  const previous = normalizeStoredEmail(row.previous_email);
  const updated = previous
    ? await run(
        `UPDATE events SET host_email = ?, host_email_verified_at = ? WHERE id = ? AND lower(host_email) = lower(?)`,
        [row.new_email, now, row.event_id, previous],
      )
    : await run(
        `UPDATE events SET host_email = ?, host_email_verified_at = ?
         WHERE id = ? AND (host_email IS NULL OR trim(host_email) = '')`,
        [row.new_email, now, row.event_id],
      );
  if (Number(updated.rowsAffected) !== 1) return null;
  return { eventId: row.event_id, email: row.new_email };
}
