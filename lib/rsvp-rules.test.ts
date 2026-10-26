import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelledMessage,
  capRemaining,
  deadlineClosedMessage,
  deadlineHasPassed,
  deadlineOpenMessage,
  goingFitsCap,
  goingPartySize,
  isUndecided,
  othersGoing,
  parseGuestCap,
  parseRsvpDeadline,
  partyFullMessage,
  partyIsCancelled,
  readGuestCap,
} from "./rsvp-rules";

const event = { ask_adults: 1, ask_kids: 1, ask_infants: 0 };

test("deadline and guest cap are optional and validated", () => {
  assert.equal(parseRsvpDeadline(""), null);
  assert.equal(parseRsvpDeadline("2026-11-07"), "2026-11-07T23:59");
  assert.equal(parseRsvpDeadline("2026-02-31"), "invalid");
  assert.equal(parseRsvpDeadline("next week"), "invalid");
  assert.equal(parseGuestCap(""), null);
  assert.equal(parseGuestCap("12"), 12);
  assert.equal(parseGuestCap("0"), "invalid");
  assert.equal(parseGuestCap("1.5"), "invalid");
  assert.equal(readGuestCap(0), null);
  assert.equal(readGuestCap(8), 8);
});

test("a deadline locks replies after the end of that day", () => {
  const deadline = "2026-11-07T23:59";
  const before = Date.parse("2026-11-07T23:58");
  const after = Date.parse("2026-11-07T23:59");
  assert.equal(deadlineHasPassed(deadline, before), false);
  assert.equal(deadlineHasPassed(deadline, after), true);
  assert.equal(deadlineHasPassed(null, after), false);
  assert.equal(deadlineOpenMessage(deadline), "Please reply by November 7, 2026.");
  assert.equal(deadlineClosedMessage(deadline), "RSVPs closed on November 7, 2026.");
});

test("cancelled is a state, and only waiting or maybe are undecided", () => {
  assert.equal(partyIsCancelled(null), false);
  assert.equal(partyIsCancelled("  "), false);
  assert.equal(partyIsCancelled("2026-11-01T00:00:00.000Z"), true);
  assert.match(cancelledMessage("Bernardo"), /Bernardo cancelled this party/);
  assert.equal(isUndecided(null), true);
  assert.equal(isUndecided(2), true);
  assert.equal(isUndecided(1), false);
  assert.equal(isUndecided(0), false);
});

test("guest cap counts people going and ignores maybe", () => {
  const rows = [
    { invitee_id: "a", attending: 1, adults: 2, kids: 1, infants: 0 },
    { invitee_id: "b", attending: 2, adults: 4, kids: 0, infants: 0 },
    { invitee_id: "c", attending: 0, adults: 2, kids: 0, infants: 0 },
  ];
  assert.equal(othersGoing(event, rows, "new"), 3);
  assert.equal(othersGoing(event, rows, "a"), 0);
  assert.equal(goingPartySize(event, 2, 0, 0), 2);
  assert.equal(goingFitsCap(null, 3, 2), true);
  assert.equal(goingFitsCap(4, 3, 2), false);
  assert.equal(goingFitsCap(4, 3, 1), true);
  assert.equal(goingFitsCap(4, 3, 0), true);
  assert.equal(capRemaining(4, 3), 1);
  assert.equal(capRemaining(null, 3), null);
  assert.match(partyFullMessage(4, true), /full \(4 people\)/);
  assert.match(partyFullMessage(4, true), /maybe/);
  assert.doesNotMatch(partyFullMessage(4, false), /maybe/);
});
