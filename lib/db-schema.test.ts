import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";

test("startup migration adds missing host and email2 columns and keeps old invitees", async () => {
  const dir = mkdtempSync(join(tmpdir(), "partyz-schema-"));
  const file = join(dir, "invite.db");
  const setup = createClient({ url: `file:${file}` });
  await setup.execute(`CREATE TABLE events (
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
  )`);
  await setup.execute(`CREATE TABLE invitees (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    invited_at TEXT,
    created_at TEXT NOT NULL
  )`);
  await setup.execute({
    sql: `INSERT INTO events (id, admin_token, title, starts_at, host_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ["e1", "admin-token", "Dinner", "2026-10-03T18:00", "Alex", "2020-01-01T00:00:00.000Z"],
  });
  await setup.execute({
    sql: `INSERT INTO invitees (id, event_id, email, display_name, token, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ["i1", "e1", "Old@Example.com", "Old Guest", "tok-old", "2020-01-01T00:00:00.000Z"],
  });
  setup.close();

  process.env.TURSO_DATABASE_URL = `file:${file}`;
  const db = await import("./db");
  const inviteeCols = await db.query<{ name: string }>("PRAGMA table_info(invitees)");
  const eventCols = await db.query<{ name: string }>("PRAGMA table_info(events)");
  const inviteeNames = inviteeCols.map((col) => col.name);
  const eventNames = eventCols.map((col) => col.name);
  assert.ok(inviteeNames.includes("email2"));
  assert.ok(eventNames.includes("host_email"));
  assert.ok(eventNames.includes("host_claim_token"));
  assert.ok(eventNames.includes("host_claimed_at"));

  const old = await db.query<{ email: string; email2: string | null }>(
    "SELECT email, email2 FROM invitees WHERE id = ?",
    ["i1"],
  );
  assert.equal(old[0]?.email, "Old@Example.com");
  assert.equal(old[0]?.email2, null);

  await db.readyDb();
  const again = await db.query<{ name: string }>("PRAGMA table_info(invitees)");
  assert.equal(again.filter((col) => col.name === "email2").length, 1);

  await db.insertInvitee("e1", "  New@Example.com ", "The New family", "  Sam@Example.com ");
  const stored = await db.query<{ email: string; email2: string | null }>(
    "SELECT email, email2 FROM invitees WHERE display_name = ?",
    ["The New family"],
  );
  assert.equal(stored[0]?.email, "new@example.com");
  assert.equal(stored[0]?.email2, "sam@example.com");

  const used = await db.emailsUsedOnEvent("e1");
  assert.equal(used.has("old@example.com"), true);
  assert.equal(used.has("new@example.com"), true);
  assert.equal(used.has("sam@example.com"), true);
  assert.equal(used.has("old guest"), false);

  rmSync(dir, { recursive: true, force: true });
});
