import assert from "node:assert/strict";
import test from "node:test";
import { formatReminded } from "./format";
import { changeNoticeContent, guestMessageContent, reminderContent } from "./guest-mail";
import {
  REMINDER_COOLDOWN_MS,
  bulkMailBlocked,
  csvCell,
  describePartyChanges,
  guestEmailNotice,
  guestStatusLabel,
  guestsToCsv,
  hostReplyTo,
  matchesAudience,
  parseShareCap,
  recipientCount,
  remindedRecently,
  shareSignupsOpen,
  withinRateLimit,
} from "./guest-list";
import { parseInviteeCsv } from "./invitee-csv";

test("export csv keeps import columns and round-trips names and emails", () => {
  const csv = guestsToCsv([
    {
      display_name: "The Rivera family",
      email: "Alex@Example.com",
      email2: "Sam@Example.com",
      attending: 1,
      adults: 2,
      kids: 0,
      infants: 0,
      comment: 'Bringing "cake", maybe',
    },
    {
      display_name: "Pat",
      email: "",
      email2: null,
      attending: null,
      adults: null,
      kids: null,
      infants: null,
      comment: null,
    },
  ]);
  assert.match(csv, /name,email,email2,status,adults,kids,infants,comment/);
  assert.match(csv, /Yes/);
  assert.match(csv, /Pending/);
  const plan = parseInviteeCsv(csv);
  assert.equal(plan.skips.length, 1);
  assert.equal(plan.skips[0]?.reason, "invalid email");
  assert.equal(plan.toAdd.length, 1);
  assert.equal(plan.toAdd[0]?.displayName, "The Rivera family");
  assert.equal(plan.toAdd[0]?.email, "alex@example.com");
  assert.equal(plan.toAdd[0]?.email2, "sam@example.com");
  assert.equal(guestStatusLabel(2), "Maybe");
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("\t=1"), "'\t=1");
  assert.equal(csvCell("\r=1"), `"'\r=1"`);
  assert.equal(csvCell("Alex"), "Alex");
});

test("waiting includes unanswered guests and a future Maybe, not yes or no", () => {
  const rows = [
    { email: "a@example.com", email2: "b@example.com", attending: null },
    { email: "c@example.com", email2: null, attending: 1 },
    { email: "d@example.com", email2: null, attending: 0 },
    { email: "e@example.com", email2: null, attending: 2 },
    { email: "", email2: null, attending: null },
  ];
  assert.equal(matchesAudience(null, "waiting"), true);
  assert.equal(matchesAudience(2, "waiting"), true);
  assert.equal(matchesAudience(1, "waiting"), false);
  assert.equal(matchesAudience(0, "going"), false);
  assert.equal(recipientCount(rows, "waiting"), 3);
  assert.equal(recipientCount(rows, "going"), 1);
  assert.equal(recipientCount(rows, "everyone"), 5);
});

test("share cap and rate limit", () => {
  assert.deepEqual(shareSignupsOpen({ enabled: false, cap: null, joined: 0 }), {
    open: false,
    reason: "closed",
  });
  assert.deepEqual(shareSignupsOpen({ enabled: true, cap: 2, joined: 2 }), {
    open: false,
    reason: "full",
  });
  assert.equal(shareSignupsOpen({ enabled: true, cap: null, joined: 40 }).open, true);
  assert.deepEqual(parseShareCap(""), { cap: null });
  assert.deepEqual(parseShareCap("12"), { cap: 12 });
  assert.equal("error" in parseShareCap("0"), true);
  assert.equal(withinRateLimit(29), true);
  assert.equal(withinRateLimit(30), false);
});

test("date or place edits are the only change-notice triggers", () => {
  const same = describePartyChanges(
    { starts_at: "2026-10-17T14:00", location: "Park" },
    { starts_at: "2026-10-17T14:00", location: "Park" },
    (value) => value,
  );
  assert.deepEqual(same, []);
  const moved = describePartyChanges(
    { starts_at: "2026-10-17T14:00", location: "Park" },
    { starts_at: "2026-10-18T15:00", location: "Hall" },
    (value) => value,
  );
  assert.deepEqual(moved, [
    { label: "When", from: "2026-10-17T14:00", to: "2026-10-18T15:00" },
    { label: "Place", from: "Park", to: "Hall" },
  ]);
});

test("guest emails include the personal link and a what-changed block", () => {
  const reminder = reminderContent({
    guestName: "Alex",
    hostName: "Sam",
    title: "Dinner",
    when: "Saturday, October 17",
    location: "Park",
    rsvpLink: "https://example.com/rsvp/abc",
  });
  assert.match(reminder.subject, /Are you coming\? Dinner/);
  assert.match(reminder.text, /https:\/\/example.com\/rsvp\/abc/);

  const change = changeNoticeContent({
    guestName: "Alex",
    hostName: "Sam",
    title: "Dinner",
    rsvpLink: "https://example.com/rsvp/abc",
    changes: [
      { label: "When", from: "Friday 6:00 PM", to: "Saturday 7:00 PM" },
      { label: "Place", from: "Park", to: "Hall" },
    ],
    optOutLink: "https://example.com/opt-out/abc",
  });
  assert.match(change.text, /What changed:/);
  assert.match(change.text, /When: Friday 6:00 PM → Saturday 7:00 PM/);
  assert.match(change.text, /Place: Park → Hall/);
  assert.match(change.html, /What changed/);
  assert.match(change.text, /opt out: https:\/\/example.com\/opt-out\/abc/);
  assert.match(change.html, /opt out/);

  const message = guestMessageContent({
    guestName: "Alex",
    hostName: "Sam",
    title: "Dinner",
    when: "Saturday",
    location: "Park",
    message: "Bring a chair.\n<script>",
    rsvpLink: "https://example.com/rsvp/abc",
  });
  assert.match(message.text, /Bring a chair/);
  assert.match(message.html, /&lt;script&gt;/);
  assert.equal(hostReplyTo(" Host@Example.com "), "host@example.com");
  assert.equal(hostReplyTo(""), undefined);
  assert.equal(
    guestEmailNotice({ verb: "Reminded", sentGuests: 2, failed: ["a@b.co"] }),
    "Reminded 2 guests. Could not email a@b.co.",
  );
});

test("bulk mail skips opted-out guests and unverified link signups", () => {
  assert.equal(bulkMailBlocked({ attending: 1, email_opt_out: 1, joined_via: "host" }, "everyone"), true);
  assert.equal(bulkMailBlocked({ attending: null, joined_via: "link" }, "waiting"), true);
  assert.equal(bulkMailBlocked({ attending: 1, joined_via: "link" }, "everyone"), true);
  assert.equal(bulkMailBlocked({ attending: 1, joined_via: "link" }, "going"), true);
  assert.equal(bulkMailBlocked({ attending: 2, joined_via: "link" }, "waiting"), false);
  assert.equal(bulkMailBlocked({ attending: 2, joined_via: "link" }, "everyone"), true);
  assert.equal(bulkMailBlocked({ attending: 1, joined_via: "host" }, "going"), false);
  assert.equal(bulkMailBlocked({ attending: null, joined_via: "host" }, "waiting"), false);
  const now = Date.parse("2026-10-04T12:00:00.000Z");
  assert.equal(remindedRecently("2026-10-04T11:00:00.000Z", now), true);
  assert.equal(remindedRecently(new Date(now - REMINDER_COOLDOWN_MS - 1000).toISOString(), now), false);
  assert.equal(remindedRecently(null, now), false);
});

test("reminded label uses a short month and day", () => {
  const iso = "2026-09-30T12:00:00.000Z";
  const expected = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );
  assert.equal(formatReminded(iso), `Reminded ${expected}`);
  assert.equal(formatReminded(null), null);
});
