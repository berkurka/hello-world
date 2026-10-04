import assert from "node:assert/strict";
import test from "node:test";
import { countSummary } from "./format";

const event = { ask_adults: 1, ask_kids: 1, ask_infants: 1 };

test("countSummary omits zero counts", () => {
  assert.equal(countSummary(event, { adults: 2, kids: 1, infants: 0 }), "2 adults · 1 kid");
  assert.equal(countSummary(event, { adults: 1, kids: 0, infants: 0 }), "1 adult");
  assert.equal(countSummary(event, { adults: 0, kids: 0, infants: 0 }), "");
});

test("countSummary skips questions the host did not ask", () => {
  assert.equal(
    countSummary({ ask_adults: 1, ask_kids: 0, ask_infants: 0 }, { adults: 3, kids: 2, infants: 1 }),
    "3 adults",
  );
});
