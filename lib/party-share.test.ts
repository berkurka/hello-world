import assert from "node:assert/strict";
import test from "node:test";
import { inviteCardPath } from "./app-url";
import { appleMapsUrl, googleMapsUrl, mapsUrl } from "./maps";
import { partyImagePath } from "./party-image";
import {
  eventVersion,
  formatShareWhen,
  partyShareDescription,
  partyShareTitle,
  versionedCacheControl,
} from "./party-share";

test("share text names the host and the party", () => {
  const event = {
    host_name: "Bernardo",
    title: "Maya's 7th Birthday",
    starts_at: "2026-10-17T14:00",
    location: "Riverside Park",
  };
  assert.equal(partyShareTitle(event), "Bernardo invited you to Maya's 7th Birthday");
  assert.equal(formatShareWhen(event.starts_at), "Sat, Oct 17 · 2:00 PM");
  assert.equal(partyShareDescription(event), "Sat, Oct 17 · 2:00 PM · Riverside Park");
});

test("card and photo urls change when the party is edited", () => {
  assert.equal(eventVersion({ updated_at: null, created_at: "2026-01-01T00:00:00.000Z" }), "2026-01-01T00:00:00.000Z");
  assert.equal(
    eventVersion({ updated_at: "2026-02-02T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" }),
    "2026-02-02T00:00:00.000Z",
  );
  assert.equal(inviteCardPath("tok"), "/api/invite-card/tok");
  assert.equal(
    inviteCardPath("tok", "2026-02-02T00:00:00.000Z", "og"),
    "/api/invite-card/tok?size=og&v=2026-02-02T00%3A00%3A00.000Z",
  );
  assert.equal(partyImagePath("evt"), "/api/party-image/evt");
  assert.match(partyImagePath("evt", "2026-02-02T00:00:00.000Z"), /v=/);
  assert.equal(versionedCacheControl(true), "public, max-age=31536000, immutable");
  assert.equal(versionedCacheControl(false), "private, no-cache");
});

test("maps links search the location text and prefer Apple Maps on iOS", () => {
  assert.match(googleMapsUrl("Riverside Park"), /google\.com\/maps\/search/);
  assert.match(appleMapsUrl("Riverside Park"), /maps\.apple\.com/);
  assert.match(mapsUrl("Riverside Park", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), /maps\.apple\.com/);
  assert.match(mapsUrl("Riverside Park", "Mozilla/5.0 (Windows NT 10.0)"), /google\.com\/maps/);
});
