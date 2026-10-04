import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SHARE_JOIN_EVENT_LIMIT, SHARE_JOIN_LIMIT } from "./guest-list";

const dir = mkdtempSync(join(tmpdir(), "partyz-guests-"));
process.env.TURSO_DATABASE_URL = `file:${join(dir, "invite.db")}`;
process.env.TURSO_AUTH_TOKEN = "";

async function load() {
  const db = await import("./db");
  const guests = await import("./guests");
  const emailLog = await import("./email-log");
  return { db, guests, emailLog };
}

async function seedEvent(db: Awaited<ReturnType<typeof load>>["db"]) {
  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, ask_comment, ask_adults, ask_kids, ask_infants, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 0, ?)`,
    ["e1", "admin", "Dinner", "2026-10-17T18:00", "Park", "Sam", "sam@example.com", "2026-10-01T00:00:00.000Z"],
  );
}

test("host can edit, record a reply, replace a link, and remove a guest", async () => {
  const { db, guests } = await load();
  await seedEvent(db);
  const added = await db.insertInvitee("e1", "alex@example.com", "Alex");
  const edited = await guests.updateGuestContact("e1", added.id, {
    displayName: "Alex Rivera",
    email: "alex@example.com",
    email2: "sam@example.com",
  });
  assert.equal("ok" in edited, true);
  await db.insertInvitee("e1", "other@example.com", "Other");
  const duplicate = await guests.updateGuestContact("e1", added.id, {
    displayName: "Alex Rivera",
    email: "other@example.com",
    email2: "sam@example.com",
  });
  assert.equal("error" in duplicate && duplicate.error.includes("already used"), true);

  const event = await db.getEvent("e1");
  assert.ok(event);
  const recorded = await guests.recordHostRsvp(event, added.id, {
    attendingRaw: "yes",
    comment: "Called me",
    adults: "2",
    kids: "0",
    infants: "0",
  });
  assert.equal("ok" in recorded, true);
  const rsvp = await db.getRsvp(added.id);
  assert.equal(rsvp?.attending, 1);
  assert.equal(rsvp?.entered_by_host, 1);
  assert.equal(rsvp?.comment, "Called me");
  assert.equal(rsvp?.adults, 2);

  const rotated = await guests.rotateGuestLink("e1", added.id);
  assert.equal("token" in rotated, true);
  if (!("token" in rotated)) return;
  assert.equal(await db.getInviteeByToken(added.token), null);
  assert.equal((await db.getInviteeByToken(rotated.token))?.id, added.id);

  const removed = await guests.removeGuest("e1", added.id);
  assert.equal("ok" in removed, true);
  assert.equal(await db.getRsvp(added.id), null);
  assert.equal(await db.getInviteeForEvent("e1", added.id), null);
});

test("paste reuses the csv parser and skips emails already on the event", async () => {
  const { db, guests } = await load();
  await db.insertInvitee("e1", "kept@example.com", "Kept");
  const result = await guests.importInviteesFromText(
    "e1",
    ["name,email,email2", "Kept,kept@example.com,", "New Person,new@example.com,new2@example.com"].join(
      "\n",
    ),
  );
  assert.equal(result.added, 1);
  assert.match(result.summary, /Skipped 1/);
  const rows = await db.listInvitees("e1");
  assert.equal(rows.some((row) => row.email === "new@example.com" && row.email2 === "new2@example.com"), true);
});

test("share link creates a guest, enforces the cap, and rate-limits an address", async () => {
  const { db, guests } = await load();
  const event = await db.getEvent("e1");
  assert.ok(event);
  const saved = await guests.saveShareSettings("e1", {
    enabled: true,
    capRaw: "1",
    currentToken: null,
  });
  assert.equal("token" in saved, true);
  const open = await db.getEvent("e1");
  assert.ok(open);
  assert.equal(open.share_enabled, 1);
  assert.equal(open.share_cap, 1);

  const first = await guests.joinFromShare({
    event: open,
    displayName: "Jordan",
    email: "",
    attendingRaw: "yes",
    comment: "",
    adults: "1",
    kids: "0",
    infants: "0",
    ip: "203.0.113.5",
  });
  assert.equal("token" in first, true);
  const listed = await db.listInvitees("e1");
  const jordan = listed.find((row) => row.display_name === "Jordan");
  assert.equal(jordan?.joined_via, "link");
  assert.equal(jordan?.attending, 1);
  assert.equal(jordan?.entered_by_host, 0);
  assert.equal(jordan?.email, "");

  const second = await guests.joinFromShare({
    event: { ...open, share_cap: 1 },
    displayName: "Casey",
    email: "",
    attendingRaw: "no",
    comment: "",
    adults: "0",
    kids: "0",
    infants: "0",
    ip: "203.0.113.6",
  });
  assert.equal("error" in second && second.error.includes("sign-up limit"), true);

  await guests.saveShareSettings("e1", { enabled: true, capRaw: "", currentToken: open.share_token });
  const uncapped = await db.getEvent("e1");
  assert.ok(uncapped);
  assert.equal(uncapped.share_cap, null);
  const replaced = await guests.rotateShareLink("e1");
  assert.notEqual(replaced, open.share_token);
  assert.equal((await db.getEventByShareToken(open.share_token!)), null);
  assert.equal((await db.getEventByShareToken(replaced))?.id, "e1");

  const now = new Date("2026-10-04T12:00:00.000Z");
  for (let i = 0; i < SHARE_JOIN_LIMIT; i += 1) {
    await db.run(
      `INSERT INTO share_join_attempts (id, event_id, ip, created_at) VALUES (?, ?, ?, ?)`,
      [`attempt-${i}`, "e1", "198.51.100.9", now.toISOString()],
    );
  }
  const limited = await guests.joinFromShare({
    event: { ...uncapped, share_token: replaced, share_enabled: 1, share_cap: null },
    displayName: "Too Many",
    email: "too@example.com",
    attendingRaw: "yes",
    comment: "",
    adults: "1",
    kids: "0",
    infants: "0",
    ip: "198.51.100.9",
    now,
  });
  assert.equal("error" in limited && limited.error.includes("Too many sign-ups"), true);

  await guests.saveShareSettings("e1", {
    enabled: false,
    capRaw: "",
    currentToken: replaced,
    wasEnabled: true,
  });
  const reenabled = await guests.saveShareSettings("e1", {
    enabled: true,
    capRaw: "",
    currentToken: replaced,
    wasEnabled: false,
  });
  assert.equal("token" in reenabled, true);
  if (!("token" in reenabled)) return;
  assert.notEqual(reenabled.token, replaced);
  assert.equal(await db.getEventByShareToken(replaced), null);

  await db.run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, share_token, share_enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ["e2", "admin-2", "Lunch", "2026-10-18T18:00", "Hall", "Sam", "share-e2", "2026-10-01T00:00:00.000Z"],
  );
  const crowded = await db.getEvent("e2");
  assert.ok(crowded);
  for (let i = 0; i < SHARE_JOIN_EVENT_LIMIT; i += 1) {
    await db.run(
      `INSERT INTO share_join_attempts (id, event_id, ip, created_at) VALUES (?, ?, ?, ?)`,
      [`event-attempt-${i}`, "e2", `203.0.113.${i % 50}`, now.toISOString()],
    );
  }
  const eventLimited = await guests.joinFromShare({
    event: crowded,
    displayName: "Crowd",
    email: "crowd@example.com",
    attendingRaw: "yes",
    comment: "",
    adults: "1",
    kids: "0",
    infants: "0",
    ip: "192.0.2.8",
    now,
  });
  assert.equal("error" in eventLimited && eventLimited.error.includes("party link"), true);
});

test("email log counts sends since utc midnight", async () => {
  const { emailLog } = await load();
  await emailLog.recordEmailSend("a@example.com", "reminder", new Date("2026-10-04T01:00:00.000Z"));
  await emailLog.recordEmailSend("b@example.com", "message", new Date("2026-10-03T23:00:00.000Z"));
  const today = await emailLog.countEmailsSentToday(new Date("2026-10-04T18:00:00.000Z"));
  assert.equal(today, 1);
  rmSync(dir, { recursive: true, force: true });
});
