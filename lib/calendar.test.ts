import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIcs,
  eventRange,
  googleCalendarUrl,
  outlookCalendarUrl,
  resolveEndsAt,
  wallTimeToUtc,
} from "./calendar";

const party = {
  title: "Maya's 7th Birthday",
  startsAt: "2026-10-17T14:00",
  endsAt: null as string | null,
  timezone: null as string | null,
  location: "Riverside Park",
  details: "RSVP: https://example.com/rsvp/abc",
};

test("end time defaults to 3 hours and rolls past midnight", () => {
  const range = eventRange({ starts_at: "2026-10-17T14:00", ends_at: null });
  assert.equal(range && `${range.end.hh}:${range.end.mm}`, "17:0");
  const late = eventRange({ starts_at: "2026-10-17T22:00", ends_at: null });
  assert.equal(late?.end.d, 18);
  assert.equal(late?.end.hh, 1);
  assert.equal(resolveEndsAt("2026-10-17T14:00", "15:30"), "2026-10-17T15:30");
  assert.equal(resolveEndsAt("2026-10-17T14:00", "11:00"), "2026-10-18T11:00");
  assert.equal(resolveEndsAt("2026-10-17T14:00", ""), null);
});

test("ics uses floating local time until a zone is saved", () => {
  const ics = buildIcs({ ...party, uid: "guest@partyz", description: party.details });
  assert.ok(ics);
  assert.match(ics!, /DTSTART:20261017T140000\r\n/);
  assert.match(ics!, /DTEND:20261017T170000\r\n/);
  assert.doesNotMatch(ics!, /TZID/);
  assert.match(ics!, /SUMMARY:Maya's 7th Birthday/);
  assert.match(ics!, /LOCATION:Riverside Park/);
  assert.match(ics!, /RSVP: https:\/\/example.com\/rsvp\/abc/);
});

test("ics anchors to the host time zone when one is saved", () => {
  const ics = buildIcs({
    ...party,
    uid: "guest@partyz",
    description: party.details,
    timezone: "America/New_York",
    endsAt: "2026-10-17T16:00",
  });
  assert.match(ics!, /DTSTART;TZID=America\/New_York:20261017T140000/);
  assert.match(ics!, /DTEND;TZID=America\/New_York:20261017T160000/);
  const utc = wallTimeToUtc({ y: 2026, mo: 10, d: 17, hh: 14, mm: 0 }, "America/New_York");
  assert.equal(utc?.toISOString(), "2026-10-17T18:00:00.000Z");
});

test("calendar links include the rsvp details and the host zone", () => {
  const google = googleCalendarUrl({ ...party, timezone: "America/Los_Angeles" });
  assert.ok(google?.startsWith("https://calendar.google.com/calendar/render?"));
  assert.match(google!, /dates=20261017T140000%2F20261017T170000/);
  assert.match(google!, /ctz=America%2FLos_Angeles/);
  const outlook = outlookCalendarUrl({ ...party, timezone: "America/New_York" });
  assert.match(outlook!, /outlook\.live\.com/);
  assert.match(outlook!, /startdt=2026-10-17T18%3A00%3A00Z/);
  const floating = outlookCalendarUrl(party);
  assert.match(floating!, /startdt=2026-10-17T14%3A00%3A00(?!Z)/);
});
