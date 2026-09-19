import assert from "node:assert/strict";
import test from "node:test";
import {
  PARTY_IMAGE_BAD_TYPE,
  PARTY_IMAGE_MAX_BYTES,
  PARTY_IMAGE_TOO_LARGE,
  fieldKeyFromMessage,
  inspectPartyImage,
  partyImagePath,
  sniffImageMime,
} from "./party-image";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("sniffs a tiny PNG placeholder and accepts it", () => {
  assert.equal(sniffImageMime(PNG_1X1), "image/png");
  const result = inspectPartyImage(PNG_1X1, "image/png");
  assert.deepEqual(result, { ok: true, mime: "image/png" });
});

test("accepts jpeg magic bytes even when the browser omits a type", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  assert.equal(sniffImageMime(jpeg), "image/jpeg");
  assert.deepEqual(inspectPartyImage(jpeg, ""), { ok: true, mime: "image/jpeg" });
});

test("rejects SVG and other non-images even if labelled image/*", () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  assert.equal(sniffImageMime(svg), null);
  assert.deepEqual(inspectPartyImage(svg, "image/svg+xml"), {
    ok: false,
    error: PARTY_IMAGE_BAD_TYPE,
  });
  const csv = Buffer.from("display_name,email\nAlex,alex@example.com\n");
  assert.deepEqual(inspectPartyImage(csv, "text/csv"), {
    ok: false,
    error: PARTY_IMAGE_BAD_TYPE,
  });
});

test("rejects images over the max size", () => {
  const oversized = Buffer.alloc(PARTY_IMAGE_MAX_BYTES + 1, PNG_1X1[0]);
  PNG_1X1.copy(oversized, 0, 0, Math.min(PNG_1X1.length, oversized.length));
  assert.deepEqual(inspectPartyImage(oversized, "image/png"), {
    ok: false,
    error: PARTY_IMAGE_TOO_LARGE,
  });
});

test("maps create-form error copy to the first field to scroll to", () => {
  assert.equal(fieldKeyFromMessage("Title is required."), "title");
  assert.equal(fieldKeyFromMessage("Date and time are required."), "startsDate");
  assert.equal(fieldKeyFromMessage("Host name is required."), "hostName");
  assert.equal(fieldKeyFromMessage("Host email is required."), "hostEmail");
  assert.equal(fieldKeyFromMessage(PARTY_IMAGE_BAD_TYPE), "partyImage");
});

test("public image path does not embed secrets", () => {
  const path = partyImagePath("evt_example");
  assert.equal(path, "/api/party-image/evt_example");
  assert.doesNotMatch(path, /host_claim_token|TURSO|GMAIL|RESEND|\?t=/);
});
