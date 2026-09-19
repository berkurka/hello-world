import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExistingEmails,
  inviteeCsvTemplate,
  parseInviteeCsv,
  summarizeInviteeImport,
} from "./invitee-csv";

test("template uses invitee columns and fake placeholder rows", () => {
  const csv = inviteeCsvTemplate();
  assert.match(csv, /^display_name,email\n/);
  assert.match(csv, /Alex Example,alex@example.com/);
  assert.match(csv, /Jordan Guest,jordan@example.com/);
  assert.doesNotMatch(csv, /@gmail\.com/);
  assert.doesNotMatch(csv, /host_claim_token|TURSO|GMAIL|RESEND|\?t=/);
});

test("parses the template into two invitees", () => {
  const plan = parseInviteeCsv(inviteeCsvTemplate());
  assert.equal(plan.skips.length, 0);
  assert.deepEqual(
    plan.toAdd.map((row) => [row.displayName, row.email]),
    [
      ["Alex Example", "alex@example.com"],
      ["Jordan Guest", "jordan@example.com"],
    ],
  );
});

test("accepts displayName / Email headers and quoted names", () => {
  const plan = parseInviteeCsv(
    'displayName,Email\n"Example, Alex",alex@example.com\nSam Guest,sam@example.com\n',
  );
  assert.equal(plan.skips.length, 0);
  assert.equal(plan.toAdd[0]?.displayName, "Example, Alex");
  assert.equal(plan.toAdd[0]?.email, "alex@example.com");
  assert.equal(plan.toAdd[1]?.displayName, "Sam Guest");
});

test("skips invalid, blank-name, and in-file duplicate emails", () => {
  const plan = parseInviteeCsv(
    [
      "display_name,email",
      "Valid Person,valid@example.com",
      "Bad Email,not-an-email",
      ",missing-name@example.com",
      "Again,valid@example.com",
      "Also Valid,also@example.com",
    ].join("\n"),
  );
  assert.deepEqual(
    plan.toAdd.map((row) => row.email),
    ["valid@example.com", "also@example.com"],
  );
  assert.deepEqual(
    plan.skips.map((skip) => [skip.line, skip.reason]),
    [
      [3, "invalid email"],
      [4, "missing display name"],
      [5, "duplicate email in this file"],
    ],
  );
});

test("skips emails already on the event", () => {
  const parsed = parseInviteeCsv(
    "display_name,email\nAlex Example,alex@example.com\nNew Guest,new@example.com\n",
  );
  const plan = applyExistingEmails(parsed, ["Alex@example.com"]);
  assert.deepEqual(
    plan.toAdd.map((row) => row.email),
    ["new@example.com"],
  );
  assert.deepEqual(plan.skips, [{ line: 2, reason: "already on this event" }]);
});

test("summarizes mixed imports without failing silently", () => {
  assert.equal(summarizeInviteeImport(2, []), "Added 2 invitees.");
  assert.equal(
    summarizeInviteeImport(1, [{ line: 3, reason: "invalid email" }]),
    "Added 1 invitee. Skipped 1: row 3 invalid email.",
  );
  assert.equal(
    summarizeInviteeImport(0, [{ line: 2, reason: "already on this event" }]),
    "No invitees added. Skipped 1: row 2 already on this event.",
  );
});

test("parses semicolon CSVs from spreadsheet exports", () => {
  const plan = parseInviteeCsv("display_name;email\nAlex Example;alex@example.com\n");
  assert.equal(plan.toAdd[0]?.email, "alex@example.com");
});

test("treats headerless two-column rows as name then email", () => {
  const plan = parseInviteeCsv("\uFEFFAlex Example,alex@example.com\n");
  assert.equal(plan.toAdd[0]?.displayName, "Alex Example");
  assert.equal(plan.toAdd[0]?.email, "alex@example.com");
});
