import assert from "node:assert/strict";
import test from "node:test";
import { inviteEmailHtml } from "./invite-email";
import { themeById } from "./themes";

test("invite email keeps the RSVP button and links the envelope image", () => {
  const html = inviteEmailHtml({
    guestName: "Priya",
    hostName: "Bernardo",
    title: "Maya's 7th Birthday",
    when: "Sat, Nov 7 · 2:00 PM",
    place: "Riverside Park",
    rsvpLink: "https://example.com/rsvp/abc",
    imageLink: "https://example.com/rsvp/abc?open=1",
    theme: themeById("classic"),
  });
  assert.match(html, /RSVP now/);
  assert.match(html, /Sat, Nov 7/);
  assert.match(html, /Riverside Park/);
  assert.match(html, /href="https:\/\/example.com\/rsvp\/abc\?open=1"/);
  assert.match(html, /cid:invitation/);
  assert.match(html, /href="https:\/\/example.com\/rsvp\/abc"/);
  assert.doesNotMatch(html, /\?t=/);
});
