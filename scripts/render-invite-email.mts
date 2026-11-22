/**
 * Write an invite email and its envelope image to disk. Does not send mail.
 *
 *   npx tsx --tsconfig tsconfig.test.json scripts/render-invite-email.mts
 *   open /tmp/partyz-invite-email/invite.html
 */
import { mkdir, writeFile } from "node:fs/promises";
import { envelopeCardPng } from "../lib/envelope-card";
import { inviteCalendarHtml, inviteEmailHtml } from "../lib/invite-email";
import { themeById } from "../lib/themes";

const dir = "/tmp/partyz-invite-email";
const rsvpLink = "https://example.com/rsvp/preview";
await mkdir(dir, { recursive: true });
const png = await envelopeCardPng({
  guestName: "Priya",
  title: "Maya's 7th Birthday",
  when: "Sat, Nov 28 · 2:00 PM",
  location: "Riverside Park",
  hostName: "Bernardo",
  theme: "classic",
});
await writeFile(`${dir}/invitation.png`, png);
const html = inviteEmailHtml({
  guestName: "Priya",
  hostName: "Bernardo",
  title: "Maya's 7th Birthday",
  when: "Sat, Nov 28 · 2:00–5:00 PM",
  place: "Riverside Park",
  rsvpLink,
  imageLink: `${rsvpLink}?open=1`,
  theme: themeById("classic"),
  calendarHtml: inviteCalendarHtml([
    { href: `${rsvpLink}/event.ics`, label: "Add to calendar" },
    { href: "https://calendar.google.com/calendar/render?action=TEMPLATE", label: "Google Calendar" },
    { href: "https://example.com/maps", label: "Open in Maps" },
  ]),
}).replaceAll("cid:invitation", "invitation.png");
await writeFile(`${dir}/invite.html`, html);
console.log(`Wrote ${dir}/invite.html and invitation.png`);
