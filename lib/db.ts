import { mkdirSync } from "fs";
import { join } from "path";
import { createClient, type Client } from "@libsql/client";
import { isEphemeralDb } from "./db-env";
import { normalizeStoredEmail } from "./format";
import { claimTokenIsOpen } from "./host-claim";
import { newId, newToken } from "./ids";
import type { EventRow, EventImageRow, InviteeRow, InviteeWithRsvp, RsvpRow } from "./types";

export { isEphemeralDb };

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function dbConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    return { url, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  if (isEphemeralDb()) {
    // Serverless has no persistent disk; /tmp is writable for this instance.
    return { url: "file:/tmp/invite.db" };
  }
  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return { url: `file:${join(dir, "invite.db")}` };
}

export function getDb() {
  if (!client) client = createClient(dbConfig());
  return client;
}

function isAlreadyExistsError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /duplicate column name/i.test(message) || /already exists/i.test(message);
}

async function tableColumns(table: string) {
  const db = getDb();
  const rs = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(rs.rows.map((row) => String(row.name)));
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = await tableColumns(table);
  if (columns.has(column)) return;
  try {
    await getDb().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (!isAlreadyExistsError(err)) throw err;
  }
}

async function ensureSchema() {
  const db = getDb();
  const statements = [
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      admin_token TEXT NOT NULL,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      host_name TEXT NOT NULL,
      host_email TEXT,
      host_claim_token TEXT,
      host_claimed_at TEXT,
      ask_comment INTEGER NOT NULL DEFAULT 1,
      ask_adults INTEGER NOT NULL DEFAULT 1,
      ask_kids INTEGER NOT NULL DEFAULT 0,
      ask_infants INTEGER NOT NULL DEFAULT 0,
      party_image_mime TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS invitees (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      email TEXT NOT NULL,
      email2 TEXT,
      display_name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      invited_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    `CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      invitee_id TEXT NOT NULL UNIQUE,
      attending INTEGER NOT NULL,
      comment TEXT,
      adults INTEGER NOT NULL DEFAULT 0,
      kids INTEGER NOT NULL DEFAULT 0,
      infants INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitee_id) REFERENCES invitees(id)
    )`,
    `CREATE TABLE IF NOT EXISTS event_images (
      event_id TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS invitees_event_email ON invitees(event_id, email)`,
    `CREATE INDEX IF NOT EXISTS invitees_event ON invitees(event_id)`,
  ];
  for (const sql of statements) {
    await db.execute(sql);
  }
  // CREATE TABLE IF NOT EXISTS does not add columns on a database that already exists.
  await addColumnIfMissing("events", "host_email", "TEXT");
  await addColumnIfMissing("events", "host_claim_token", "TEXT");
  await addColumnIfMissing("events", "host_claimed_at", "TEXT");
  await addColumnIfMissing("invitees", "email2", "TEXT");
  await addColumnIfMissing("events", "party_image_mime", "TEXT");
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS events_host_claim_token ON events(host_claim_token) WHERE host_claim_token IS NOT NULL`,
  );
}

export async function readyDb() {
  if (!schemaReady) {
    schemaReady = ensureSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  return getDb();
}

export async function query<T>(sql: string, args: (string | number | null)[] = []) {
  const db = await readyDb();
  const rs = await db.execute({ sql, args });
  // libSQL rows are not plain objects; client components reject them.
  return rs.rows.map((row) => JSON.parse(JSON.stringify(row))) as T[];
}

export async function queryOne<T>(sql: string, args: (string | number | null)[] = []) {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: (string | number | null)[] = []) {
  const db = await readyDb();
  return db.execute({ sql, args });
}

export function getEvent(id: string) {
  return queryOne<EventRow>(`SELECT * FROM events WHERE id = ?`, [id]);
}

export function getEventForOrganizer(id: string, token: string) {
  return queryOne<EventRow>(
    `SELECT * FROM events WHERE id = ? AND admin_token = ?`,
    [id, token],
  );
}

export function getEventByClaimToken(token: string) {
  return queryOne<EventRow>(`SELECT * FROM events WHERE host_claim_token = ?`, [token]);
}

export async function claimHostDashboard(token: string) {
  const event = await getEventByClaimToken(token);
  if (!event || !claimTokenIsOpen(event)) return null;
  if (!event.host_claimed_at) {
    await run(
      `UPDATE events SET host_claimed_at = ? WHERE id = ? AND host_claim_token = ? AND host_claimed_at IS NULL`,
      [new Date().toISOString(), event.id, token],
    );
  }
  return event;
}

export function getInviteeByToken(token: string) {
  return queryOne<InviteeRow>(`SELECT * FROM invitees WHERE token = ?`, [token]);
}

export function getRsvp(inviteeId: string) {
  return queryOne<RsvpRow>(`SELECT * FROM rsvps WHERE invitee_id = ?`, [inviteeId]);
}

export function listInvitees(eventId: string) {
  return query<InviteeWithRsvp>(
    `SELECT i.*, r.attending, r.comment, r.adults, r.kids, r.infants, r.updated_at AS rsvp_updated_at
     FROM invitees i
     LEFT JOIN rsvps r ON r.invitee_id = i.id
     WHERE i.event_id = ?
     ORDER BY i.created_at ASC`,
    [eventId],
  );
}

export async function emailsUsedOnEvent(eventId: string) {
  const rows = await query<{ email: string; email2: string | null }>(
    `SELECT email, email2 FROM invitees WHERE event_id = ?`,
    [eventId],
  );
  const used = new Set<string>();
  for (const row of rows) {
    const email = normalizeStoredEmail(row.email);
    const email2 = normalizeStoredEmail(row.email2);
    if (email) used.add(email);
    if (email2) used.add(email2);
  }
  return used;
}

export function getEventImage(eventId: string) {
  return queryOne<EventImageRow>(
    `SELECT event_id, mime, data, updated_at FROM event_images WHERE event_id = ?`,
    [eventId],
  );
}

export async function getEventImageDataUrl(eventId: string) {
  const image = await getEventImage(eventId);
  if (!image) return null;
  return `data:${image.mime};base64,${image.data}`;
}

export async function saveEventImage(eventId: string, mime: string, data: string) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO event_images (event_id, mime, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id) DO UPDATE SET
       mime = excluded.mime,
       data = excluded.data,
       updated_at = excluded.updated_at`,
    [eventId, mime, data, now],
  );
  await run(`UPDATE events SET party_image_mime = ? WHERE id = ?`, [mime, eventId]);
}

export async function deleteEventImage(eventId: string) {
  await run(`DELETE FROM event_images WHERE event_id = ?`, [eventId]);
  await run(`UPDATE events SET party_image_mime = NULL WHERE id = ?`, [eventId]);
}

export function insertInvitee(
  eventId: string,
  email: string,
  displayName: string,
  email2: string | null = null,
) {
  const storedEmail = normalizeStoredEmail(email);
  if (!storedEmail) throw new Error("Email is required.");
  return run(
    `INSERT INTO invitees (id, event_id, email, email2, display_name, token, invited_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      newId(),
      eventId,
      storedEmail,
      normalizeStoredEmail(email2),
      displayName,
      newToken(),
      new Date().toISOString(),
    ],
  );
}
