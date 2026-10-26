import assert from "node:assert/strict";
import test from "node:test";
import {
  ENVELOPE_GIF_ENABLED,
  ENVELOPE_GIF_NOTE,
  ENVELOPE_HEIGHT,
  ENVELOPE_STILL_REVEAL,
  ENVELOPE_WIDTH,
  envelopeCacheKey,
  envelopeRsvpHref,
} from "./envelope";

test("the email still shows the card partly out of the envelope", () => {
  assert.equal(ENVELOPE_GIF_ENABLED, false);
  assert.match(ENVELOPE_GIF_NOTE, /PNG/);
  assert.match(ENVELOPE_GIF_NOTE, /CSS/);
  assert.ok(ENVELOPE_STILL_REVEAL > 0.45);
  assert.ok(ENVELOPE_STILL_REVEAL < 0.8);
  assert.equal(ENVELOPE_WIDTH, 600);
  assert.ok(ENVELOPE_HEIGHT > ENVELOPE_WIDTH);
});

test("the envelope image links to the RSVP page with the open animation", () => {
  assert.equal(
    envelopeRsvpHref("https://example.com/rsvp/abc"),
    "https://example.com/rsvp/abc?open=1",
  );
  assert.equal(
    envelopeRsvpHref("https://example.com/rsvp/abc?done=1"),
    "https://example.com/rsvp/abc?done=1&open=1",
  );
});

test("an envelope gif would cache per party and theme", () => {
  assert.equal(
    envelopeCacheKey({ eventId: "e1", theme: "classic", version: "2026-11-01" }),
    "e1\u0000classic\u00002026-11-01",
  );
  assert.notEqual(
    envelopeCacheKey({ eventId: "e1", theme: "garden", version: "2026-11-01" }),
    envelopeCacheKey({ eventId: "e1", theme: "classic", version: "2026-11-01" }),
  );
});
