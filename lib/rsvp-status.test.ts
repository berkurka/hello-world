import assert from "node:assert/strict";
import test from "node:test";
import { attendingLabel, headcountAttending, parseAttending, storesHeadcount } from "./format";

test("maybe is a third rsvp status and keeps headcounts", () => {
  assert.equal(attendingLabel(1), "Yes");
  assert.equal(attendingLabel(2), "Maybe");
  assert.equal(attendingLabel(0), "No");
  assert.equal(attendingLabel(null), "Pending");
  assert.equal(parseAttending("maybe", true), 2);
  assert.equal(parseAttending("maybe", false), null);
  assert.equal(parseAttending("yes", false), 1);
  assert.equal(parseAttending("no", true), 0);
  assert.equal(storesHeadcount(1), true);
  assert.equal(storesHeadcount(2), true);
  assert.equal(storesHeadcount(0), false);
  assert.equal(headcountAttending(2, true), true);
  assert.equal(headcountAttending(2, false), false);
  assert.equal(headcountAttending(1, false), true);
  assert.equal(headcountAttending(0, true), false);
});
