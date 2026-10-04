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
  assert.ok(eventNames.includes("party_image_mime"));
  assert.ok(eventNames.includes("allow_maybe"));
  assert.ok(eventNames.includes("timezone"));
  assert.ok(eventNames.includes("ends_at"));
  assert.ok(eventNames.includes("updated_at"));
  const tables = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  const tableNames = tables.map((row) => row.name);
  assert.ok(tableNames.includes("host_login_tokens"));
  assert.ok(tableNames.includes("host_sessions"));
  assert.ok(tableNames.includes("host_email_changes"));
  assert.ok(tableNames.includes("host_device_grants"));

  const migrated = await db.queryOne<{ allow_maybe: number; updated_at: string | null }>(
    "SELECT allow_maybe, updated_at FROM events WHERE id = ?",
    ["e1"],
  );
  assert.equal(migrated?.allow_maybe, 1);
  assert.equal(migrated?.updated_at, null);

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

  const access = await import("./host-login");
  await db.run(`UPDATE events SET host_email = ? WHERE id = ?`, ["host@example.com", "e1"]);
  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, ask_comment, ask_adults, ask_kids, ask_infants, allow_maybe, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 0, 1, ?, ?)`,
    [
      "e2",
      "admin-2",
      "Brunch",
      "2026-12-01T11:00",
      "Cafe",
      "Alex",
      "host@example.com",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ],
  );
  const listed = await access.listEventsForHost("host@example.com");
  assert.deepEqual(
    listed.map((event) => event.id),
    ["e1", "e2"],
  );
  assert.equal((await access.listEventsForHost("other@example.com")).length, 0);

  const first = await access.issueHostLogin("host@example.com", "203.0.113.4");
  assert.equal(first.status, "sent");
  if (first.status !== "sent") return;
  assert.deepEqual(first.titles, ["Dinner", "Brunch"]);
  const missed = await access.issueHostLogin("nobody@example.com", "203.0.113.5");
  assert.equal(missed.status, "skipped");
  await access.issueHostLogin("host@example.com", "203.0.113.4");
  await access.issueHostLogin("host@example.com", "203.0.113.4");
  const limited = await access.issueHostLogin("host@example.com", "203.0.113.9");
  assert.equal(limited.status, "limited");

  assert.equal(await access.peekLoginToken(first.token), "host@example.com");
  assert.equal(await access.redeemHostLogin(first.token), "host@example.com");
  assert.equal(await access.redeemHostLogin(first.token), null);

  const session = await access.startSession("host@example.com");
  assert.equal(await access.sessionEmailFromToken(session), "host@example.com");
  const authed = await access.authorizeOrganizer("e2", null, { sessionToken: session, deviceToken: null });
  assert.equal(authed?.access, "session");
  assert.equal(authed?.event.id, "e2");
  assert.equal(
    (await access.authorizeOrganizer("e2", "nope", { sessionToken: null, deviceToken: null })),
    null,
  );

  const device = "device-token";
  await access.grantDevice("e1", device);
  const onDevice = await access.authorizeOrganizer("e1", null, { sessionToken: null, deviceToken: device });
  assert.equal(onDevice?.access, "device");

  const rotated = await access.rotateDashboardSecrets("e1");
  assert.ok(rotated);
  assert.equal(await db.getEventForOrganizer("e1", "admin-token"), null);
  assert.equal((await db.getEventForOrganizer("e1", rotated!))?.id, "e1");

  const change = await access.issueEmailChange("e2", "new-host@example.com");
  assert.equal(change.ok, true);
  if (!change.ok) return;
  const peeked = await access.peekEmailChange(change.token);
  assert.equal(peeked?.title, "Brunch");
  const redeemed = await access.redeemEmailChange(change.token);
  assert.equal(redeemed?.email, "new-host@example.com");
  assert.equal((await db.getEvent("e2"))?.host_email, "new-host@example.com");
  assert.equal(await access.redeemEmailChange(change.token), null);

  rmSync(dir, { recursive: true, force: true });
});
