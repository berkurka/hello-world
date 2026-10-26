import assert from "node:assert/strict";
import test from "node:test";
import { cancellationMail, reminderMail } from "./guest-mail";

const shared = {
  guestName: "Priya",
  hostName: "Bernardo",
  title: "Maya's 7th Birthday",
  rsvpLink: "https://example.com/rsvp/guest-token",
  note: "Bring a sweater",
};

test("a reminder goes to undecided guests with their own RSVP link", () => {
  const mail = reminderMail({
    ...shared,
    when: "Sat, Nov 7 · 2:00 PM",
    place: "Riverside Park",
  });
  assert.equal(mail.subject, "Are you coming to Maya's 7th Birthday?");
  assert.match(mail.text, /Priya/);
  assert.match(mail.text, /Bring a sweater/);
  assert.match(mail.text, /https:\/\/example.com\/rsvp\/guest-token/);
  assert.match(mail.html, /RSVP now/);
  assert.doesNotMatch(mail.text, /\?t=/);
  assert.doesNotMatch(mail.html, /admin_token|host_claim/);
});

test("a cancellation email says the party is cancelled and does not ask for an RSVP", () => {
  const mail = cancellationMail(shared);
  assert.match(mail.subject, /cancelled/);
  assert.match(mail.text, /cancelled Maya's 7th Birthday/);
  assert.match(mail.text, /don't need to reply/);
  assert.match(mail.text, /https:\/\/example.com\/rsvp\/guest-token/);
  assert.doesNotMatch(mail.html, /RSVP now/);
  assert.doesNotMatch(`${mail.subject}\n${mail.text}`, /\?t=/);
});
