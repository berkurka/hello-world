import assert from "node:assert/strict";
import test from "node:test";
import { formatSampleInviteWhen, nextSamplePartyStart } from "./sample-invite";

test("sample invite is a Saturday at 2:00 PM at least a week ahead", () => {
  const start = new Date(2026, 0, 1, 9, 0, 0);
  for (let i = 0; i < 400; i++) {
    const now = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const value = nextSamplePartyStart(now);
    const match = /^(\d{4})-(\d{2})-(\d{2})T14:00$/.exec(value);
    assert.ok(match, value);
    const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 14, 0, 0, 0);
    assert.equal(day.getDay(), 6, value);
    assert.ok(day.getTime() >= now.getTime() + 7 * 24 * 60 * 60 * 1000, value);
    assert.match(formatSampleInviteWhen(value), /^Sat, \w+ \d+ · 2:00 PM$/);
  }
});

test("a stale October date moves to the next future Saturday", () => {
  const now = new Date(2026, 9, 26, 15, 0, 0);
  assert.equal(nextSamplePartyStart(now), "2026-11-07T14:00");
  assert.equal(formatSampleInviteWhen("2026-11-07T14:00"), "Sat, Nov 7 · 2:00 PM");
});
