import { mkdirSync } from "fs";
import { join } from "path";
import { createClient, type Client } from "@libsql/client";
import type { EventRow, InviteeRow, InviteeWithRsvp, RsvpRow } from "./types";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function dbConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    return { url, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Vercel has no persistent disk. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (free Turso DB). See README.",
    );
  }
  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return { url: `file:${join(dir, "invite.db")}` };
}

export function getDb() {
  if (!client) client = createClient(dbConfig());
  return client;
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
      ask_comment INTEGER NOT NULL DEFAULT 1,
      ask_adults INTEGER NOT NULL DEFAULT 1,
      ask_kids INTEGER NOT NULL DEFAULT 0,
      ask_infants INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS invitees (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      email TEXT NOT NULL,
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
    `CREATE UNIQUE INDEX IF NOT EXISTS invitees_event_email ON invitees(event_id, email)`,
    `CREATE INDEX IF NOT EXISTS invitees_event ON invitees(event_id)`,
  ];
  for (const sql of statements) {
    await db.execute(sql);
  }
}

export async function readyDb() {
  if (!schemaReady) schemaReady = ensureSchema();
  await schemaReady;
  return getDb();
}

export async function query<T>(sql: string, args: (string | number | null)[] = []) {
  const db = await readyDb();
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as T[];
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
