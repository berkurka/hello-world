import assert from "node:assert/strict";
import test from "node:test";
import { inviteeEditError } from "./guest-edit";

test("editing a guest reuses the duplicate email check and keeps their own addresses", () => {
  const taken = ["other@example.com"];
  assert.equal(
    inviteeEditError({
      displayName: "The Lees",
      email: "lee@example.com",
      email2: "sam@example.com",
      taken,
    }),
    null,
  );
  assert.match(
    inviteeEditError({
      displayName: "The Lees",
      email: "Other@example.com",
      email2: null,
      taken,
    }) ?? "",
    /already used/,
  );
  assert.match(
    inviteeEditError({
      displayName: "",
      email: "lee@example.com",
      email2: null,
      taken,
    }) ?? "",
    /name/,
  );
  assert.match(
    inviteeEditError({
      displayName: "The Lees",
      email: "lee@example.com",
      email2: "lee@example.com",
      taken,
    }) ?? "",
    /same/,
  );
});
