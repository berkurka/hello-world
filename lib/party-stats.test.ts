import assert from "node:assert/strict";
import test from "node:test";
import { rsvpStatus, rsvpStatusLabel } from "./format";
import { goingNeedsPeople, headcount, peopleComing, replyProgress, statusCounts } from "./party-stats";

const event = { ask_adults: 1, ask_kids: 1, ask_infants: 1 };

test("headcount adds going guests and treats a family as one when counts are off", () => {
  assert.equal(headcount(event, { attending: 1, adults: 2, kids: 1, infants: 1 }), 4);
  assert.equal(headcount(event, { attending: 0, adults: 2, kids: 1, infants: 0 }), 0);
  assert.equal(headcount(event, { attending: null, adults: 0, kids: 0, infants: 0 }), 0);
  assert.equal(
    headcount({ ask_adults: 0, ask_kids: 0, ask_infants: 0 }, { attending: 1, adults: 0, kids: 0, infants: 0 }),
    1,
  );
  assert.equal(
    peopleComing(event, [
      { attending: 1, adults: 2, kids: 0, infants: 0 },
      { attending: 1, adults: 1, kids: 1, infants: 0 },
      { attending: 0, adults: 4, kids: 0, infants: 0 },
    ]),
    4,
  );
});

test("going with zero people is blocked only when the host asks for counts", () => {
  assert.equal(goingNeedsPeople(event, 0, 0, 0), true);
  assert.equal(goingNeedsPeople(event, 1, 0, 0), false);
  assert.equal(goingNeedsPeople({ ask_adults: 0, ask_kids: 0, ask_infants: 0 }, 0, 0, 0), false);
});

test("maybe is a status the dashboard can count without being stored yet", () => {
  assert.equal(rsvpStatus(1), "going");
  assert.equal(rsvpStatus(2), "maybe");
  assert.equal(rsvpStatus(0), "declined");
  assert.equal(rsvpStatus(null), "waiting");
  assert.equal(rsvpStatusLabel("maybe"), "Maybe");
  const counts = statusCounts([{ attending: 1 }, { attending: 2 }, { attending: 0 }, { attending: null }]);
  assert.deepEqual(counts, { going: 1, maybe: 1, declined: 1, waiting: 1 });
  assert.deepEqual(replyProgress([{ attending: 1 }, { attending: null }, { attending: 0 }]), {
    replied: 2,
    total: 3,
  });
});
