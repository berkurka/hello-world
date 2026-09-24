import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStoredEmail } from "./format";
import { familyInviteNotice, inviteRecipients, unsentBatchNotice } from "./invite-delivery";

test("stores a second email trimmed and lowercased, and keeps a blank one empty", () => {
  assert.equal(normalizeStoredEmail("  Sam@Example.com "), "sam@example.com");
  assert.equal(normalizeStoredEmail("   "), null);
  assert.equal(normalizeStoredEmail(null), null);
});

test("invitees without a second email still have one recipient", () => {
  assert.deepEqual(inviteRecipients({ email: "alex@example.com", email2: null }), [
    "alex@example.com",
  ]);
  assert.deepEqual(
    inviteRecipients({ email: "alex@example.com", email2: "sam@example.com" }),
    ["alex@example.com", "sam@example.com"],
  );
});

test("a partial send names the address that failed", () => {
  assert.equal(
    familyInviteNotice(["alex@example.com"], ["sam@example.com"]),
    "Invite sent. Could not email sam@example.com.",
  );
  assert.equal(familyInviteNotice(["alex@example.com"], []), "Invite sent.");
  assert.equal(
    familyInviteNotice(["alex@example.com", "sam@example.com"], []),
    "Invite sent to both emails.",
  );
  assert.equal(
    unsentBatchNotice(2, ["sam@example.com"]),
    "Sent 2 invites. Could not email sam@example.com.",
  );
  assert.equal(unsentBatchNotice(1, []), "Sent 1 invite.");
});
