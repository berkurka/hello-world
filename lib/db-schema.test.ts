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
  assert.ok(eventNames.includes("theme"));
  assert.ok(eventNames.includes("notes"));
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

  const migrated = await db.queryOne<{
    allow_maybe: number;
    updated_at: string | null;
    theme: string;
    notes: string;
    ends_at: string | null;
    timezone: string | null;
  }>(
    "SELECT allow_maybe, updated_at, theme, notes, ends_at, timezone FROM events WHERE id = ?",
    ["e1"],
  );
  assert.equal(migrated?.allow_maybe, 0);
  assert.equal(migrated?.updated_at, null);
  assert.equal(migrated?.theme, "classic");
  assert.equal(migrated?.notes, "");
  assert.equal(migrated?.ends_at, null);
  assert.equal(migrated?.timezone, null);

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

  await db.run(`UPDATE events SET allow_maybe = 1 WHERE id = ?`, ["e1"]);
  assert.equal(await db.applyAllowMaybeBackfill(), false);
  assert.equal((await db.getEvent("e1"))?.allow_maybe, 1);
  assert.equal((await db.getEvent("e2"))?.allow_maybe, 1);
  const beforeRescope = {
    e1: (await db.getEvent("e1"))?.allow_maybe,
    e2: (await db.getEvent("e2"))?.allow_maybe,
  };
  await db.run(`DELETE FROM schema_flags WHERE name = ?`, ["allow_maybe_existing_off"]);
  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, ask_comment, ask_adults, ask_kids, ask_infants, allow_maybe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 0, 1, ?)`,
    ["e-old-maybe", "admin-old-maybe", "Old", "2026-11-01T12:00", "", "Alex", "2019-01-01T00:00:00.000Z"],
  );
  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, ask_comment, ask_adults, ask_kids, ask_infants, allow_maybe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 0, 1, ?)`,
    ["e-new-maybe", "admin-new-maybe", "New", "2026-11-01T12:00", "", "Alex", "2099-01-01T00:00:00.000Z"],
  );
  assert.equal(await db.applyAllowMaybeBackfill(), true);
  assert.equal((await db.getEvent("e-old-maybe"))?.allow_maybe, 0);
  assert.equal((await db.getEvent("e-new-maybe"))?.allow_maybe, 1);
  assert.equal(await db.applyAllowMaybeBackfill(), false);
  assert.equal((await db.getEvent("e-new-maybe"))?.allow_maybe, 1);
  await db.run(`UPDATE events SET allow_maybe = ? WHERE id = ?`, [beforeRescope.e1 ?? 0, "e1"]);
  await db.run(`UPDATE events SET allow_maybe = ? WHERE id = ?`, [beforeRescope.e2 ?? 0, "e2"]);

  const guest = await db.queryOne<{ id: string }>(
    "SELECT id FROM invitees WHERE display_name = ?",
    ["The New family"],
  );
  await db.run(
    `INSERT INTO rsvps (id, invitee_id, attending, adults, kids, infants, updated_at) VALUES (?, ?, 2, 2, 1, 0, ?)`,
    ["rsvp-maybe", guest?.id ?? "", "2026-01-02T00:00:00.000Z"],
  );
  const withMaybe = await access.listHostParties("host@example.com");
  assert.equal(Number(withMaybe.find((party) => party.id === "e1")?.yes_count), 0);
  assert.equal(Number(withMaybe.find((party) => party.id === "e1")?.people), 3);
  await db.run(`UPDATE events SET allow_maybe = 0 WHERE id = ?`, ["e1"]);
  const withoutMaybe = await access.listHostParties("host@example.com");
  assert.equal(Number(withoutMaybe.find((party) => party.id === "e1")?.people), 0);

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
  const createAfterRecovers = await access.issueLoginToken("host@example.com", "create", "198.51.100.8");
  assert.equal(createAfterRecovers.status, "issued");

  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, ask_comment, ask_adults, ask_kids, ask_infants, allow_maybe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 0, 0, ?)`,
    [
      "e-budget",
      "admin-budget",
      "Budget",
      "2026-11-01T12:00",
      "",
      "Alex",
      "budget@example.com",
      "2026-01-01T00:00:00.000Z",
    ],
  );
  const budgetIp = "203.0.113.80";
  for (let i = 0; i < 2; i++) {
    const created = await access.issueLoginToken("budget@example.com", "create", budgetIp);
    assert.equal(created.status, "issued");
  }
  for (let i = 0; i < 3; i++) {
    const recovered = await access.issueHostLogin("budget@example.com", budgetIp);
    assert.equal(recovered.status, "sent");
  }

  const sharedIp = "198.51.100.30";
  for (let i = 0; i < 20; i++) {
    const created = await access.issueLoginToken(`nat-create-${i}@example.com`, "create", sharedIp);
    assert.equal(created.status, "issued");
  }
  for (let i = 0; i < 10; i++) {
    const logged = await access.issueLoginToken(`nat-login-${i}@example.com`, "login", sharedIp);
    assert.equal(logged.status, "issued");
  }
  assert.equal((await access.issueLoginToken("nat-over@example.com", "login", sharedIp)).status, "limited");
  assert.equal((await access.issueLoginToken("nat-over-create@example.com", "create", sharedIp)).status, "limited");

  const fresh = await access.issueLoginToken("fresh@example.com", "create", "198.51.100.20");
  assert.equal(fresh.status, "issued");
  if (fresh.status !== "issued") return;
  const replaced = await access.issueLoginToken("fresh@example.com", "login", "198.51.100.21");
  assert.equal(replaced.status, "issued");
  if (replaced.status !== "issued") return;
  assert.equal(await access.peekLoginToken(fresh.token), "fresh@example.com");
  assert.equal(await access.peekLoginToken(replaced.token), "fresh@example.com");
  const newerLogin = await access.issueLoginToken("fresh@example.com", "login", "198.51.100.22");
  assert.equal(newerLogin.status, "issued");
  if (newerLogin.status !== "issued") return;
  assert.equal(await access.peekLoginToken(replaced.token), null);
  assert.equal(await access.peekLoginToken(fresh.token), "fresh@example.com");
  assert.equal(await access.peekLoginToken(newerLogin.token), "fresh@example.com");
  const newerCreate = await access.issueLoginToken("fresh@example.com", "create", "198.51.100.23");
  assert.equal(newerCreate.status, "issued");
  if (newerCreate.status !== "issued") return;
  assert.equal(await access.peekLoginToken(fresh.token), null);
  assert.equal(await access.peekLoginToken(newerLogin.token), "fresh@example.com");

  const burst = await Promise.all(
    Array.from({ length: 5 }, () => access.issueLoginToken("burst@example.com", "login", "192.0.2.10")),
  );
  assert.equal(burst.filter((row) => row.status === "issued").length, 3);

  assert.equal(await access.peekLoginToken(first.token), null);
  const singleUse = await access.issueLoginToken("once@example.com", "login", "192.0.2.40");
  assert.equal(singleUse.status, "issued");
  if (singleUse.status !== "issued") return;
  const raced = await Promise.all([
    access.redeemHostLogin(singleUse.token),
    access.redeemHostLogin(singleUse.token),
  ]);
  assert.deepEqual(raced.filter(Boolean), ["once@example.com"]);

  const openAgain = await access.issueLoginToken("host@example.com", "login", "203.0.113.40");
  assert.equal(openAgain.status, "limited");
  await db.run(`DELETE FROM host_login_tokens WHERE email = ?`, ["host@example.com"]);
  const reopened = await access.issueHostLogin("host@example.com", "203.0.113.41");
  assert.equal(reopened.status, "sent");
  if (reopened.status !== "sent") return;
  assert.equal(await access.redeemHostLogin(reopened.token), "host@example.com");
  assert.ok((await db.getEvent("e1"))?.host_email_verified_at);
  assert.equal(await access.redeemHostLogin(reopened.token), null);

  const session = await access.startSession("host@example.com");
  assert.equal(await access.sessionEmailFromToken(session), "host@example.com");
  const authed = await access.authorizeOrganizer("e2", null, { sessionToken: session, deviceToken: null });
  assert.equal(authed?.access, "session");
  assert.equal(authed?.event.id, "e2");
  const byToken = await access.authorizeOrganizer("e2", "admin-2", { sessionToken: null, deviceToken: null });
  assert.equal(byToken?.access, "token");
  const fallthrough = await access.authorizeOrganizer("e2", "nope", { sessionToken: session, deviceToken: null });
  assert.equal(fallthrough?.access, "session");
  const otherSession = await access.startSession("other@example.com");
  assert.equal(
    await access.authorizeOrganizer("e2", null, { sessionToken: otherSession, deviceToken: null }),
    null,
  );
  assert.equal(access.canChangeHostEmail("host@example.com", "Host@Example.com"), true);
  assert.equal(access.canChangeHostEmail("other@example.com", "host@example.com"), false);
  await db.run(`UPDATE events SET host_email = ? WHERE id = ?`, ["Host@Example.com", "e1"]);
  assert.deepEqual(
    (await access.listEventsForHost("host@example.com")).map((event) => event.id),
    ["e1", "e2"],
  );
  await db.run(`UPDATE events SET host_email = NULL WHERE id = ?`, ["e1"]);
  assert.equal(await access.attachHostEmail("e1", "Host@Example.com", "token"), false);
  assert.equal((await db.getEvent("e1"))?.host_email, null);
  assert.equal(await access.attachHostEmail("e1", "Host@Example.com", "device"), true);
  assert.equal((await db.getEvent("e1"))?.host_email, "host@example.com");
  assert.ok((await db.getEvent("e1"))?.host_email_verified_at);
  assert.equal(await access.attachHostEmail("e1", "other@example.com", "device"), false);

  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, ask_comment, ask_adults, ask_kids, ask_infants, allow_maybe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1, 1, 0, 0, 0, ?)`,
    ["e-open", "admin-open", "Open", "2026-11-02T12:00", "", "Alex", "2026-01-01T00:00:00.000Z"],
  );
  const attacker = await access.startSession("attacker@example.com");
  const viaLink = await access.authorizeOrganizer("e-open", "admin-open", {
    sessionToken: attacker,
    deviceToken: null,
  });
  assert.equal(viaLink?.access, "token");
  assert.equal(
    access.canChangeHostEmail("attacker@example.com", null, "attacker@example.com", viaLink?.access),
    false,
  );
  assert.equal(await access.attachHostEmail("e-open", "attacker@example.com", "token"), false);
  assert.equal((await db.getEvent("e-open"))?.host_email, null);
  assert.equal((await db.getEvent("e-open"))?.host_email_verified_at, null);

  const device = "device-token";
  await access.grantDevice("e1", device);
  const onDevice = await access.authorizeOrganizer("e1", null, { sessionToken: null, deviceToken: device });
  assert.equal(onDevice?.access, "device");
  const pending = await access.issueEmailChange("e1", "takeover@example.com", "host@example.com");
  assert.equal(pending.ok, true);
  if (!pending.ok) return;

  const rotated = await access.rotateDashboardSecrets("e1");
  assert.ok(rotated);
  assert.equal(await db.getEventForOrganizer("e1", "admin-token"), null);
  assert.equal((await db.getEventForOrganizer("e1", rotated!))?.id, "e1");
  assert.equal(await access.deviceAllows("e1", device), false);
  assert.equal(
    await access.authorizeOrganizer("e1", null, { sessionToken: null, deviceToken: device }),
    null,
  );
  const stillSignedIn = await access.authorizeOrganizer("e1", null, {
    sessionToken: session,
    deviceToken: device,
  });
  assert.equal(stillSignedIn?.access, "session");
  assert.equal(await access.peekEmailChange(pending.token), null);
  assert.equal(await access.redeemEmailChange(pending.token), null);

  const stale = await access.issueEmailChange("e2", "new-host@example.com", "host@example.com");
  assert.equal(stale.ok, true);
  if (!stale.ok) return;
  const newer = await access.issueEmailChange("e2", "later@example.com", "host@example.com");
  assert.equal(newer.ok, true);
  if (!newer.ok) return;
  assert.equal(await access.peekEmailChange(stale.token), null);
  await db.run(`UPDATE events SET host_email = ? WHERE id = ?`, ["someone-else@example.com", "e2"]);
  assert.equal(await access.redeemEmailChange(newer.token), null);
  assert.equal((await db.getEvent("e2"))?.host_email, "someone-else@example.com");

  await db.run(`UPDATE events SET host_email = ? WHERE id = ?`, ["host@example.com", "e2"]);
  const change = await access.issueEmailChange("e2", "new-host@example.com", "host@example.com");
  assert.equal(change.ok, true);
  if (!change.ok) return;
  const peeked = await access.peekEmailChange(change.token);
  assert.equal(peeked?.title, "Brunch");
  const redeemed = await access.redeemEmailChange(change.token);
  assert.equal(redeemed?.email, "new-host@example.com");
  assert.equal((await db.getEvent("e2"))?.host_email, "new-host@example.com");
  assert.ok((await db.getEvent("e2"))?.host_email_verified_at);
  assert.equal(await access.redeemEmailChange(change.token), null);

  rmSync(dir, { recursive: true, force: true });
});
