import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStoredEmail } from "./format";
import {
  appendSendError,
  familyInviteNotice,
  friendlyMailError,
  inviteRecipients,
  isFamilyInvite,
  unsentBatchNotice,
} from "./invite-delivery";

test("stores a second email trimmed and lowercased, and keeps a blank one empty", () => {
  assert.equal(normalizeStoredEmail("  Sam@Example.com "), "sam@example.com");
  assert.equal(normalizeStoredEmail("   "), null);
  assert.equal(normalizeStoredEmail(null), null);
});

test("a second email marks the invite as a family", () => {
  assert.equal(isFamilyInvite({ email2: "sam@example.com" }), true);
  assert.equal(isFamilyInvite({ email2: "  " }), false);
  assert.equal(isFamilyInvite({ email2: null }), false);
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

test("friendly mail errors hide provider text", () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(
      friendlyMailError(new Error("Email sending isn't available right now.")),
      "Email sending isn't available right now.",
    );
    assert.equal(
      friendlyMailError(new Error("550 mailbox unavailable")),
      "Could not send that email. Copy the link to share it instead.",
    );
  } finally {
    console.error = original;
  }
});

test("provider errors stay off the notice hosts see", () => {
  const notice = familyInviteNotice(["alex@example.com"], ["sam@example.com"]);
  const detail = "You can only send testing emails to your own email address";
  const logs: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    assert.equal(appendSendError(notice, detail), notice);
    assert.equal(appendSendError(notice, "  "), notice);
    assert.equal(appendSendError(unsentBatchNotice(2, ["sam@example.com"]), detail), "Sent 2 invites. Could not email sam@example.com.");
  } finally {
    console.error = original;
  }
  assert.equal(logs.length, 2);
});
