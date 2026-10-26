import assert from "node:assert/strict";
import test from "node:test";
import { canChangeHostEmail, canManageCoHosts } from "./host-login";
import { COHOST_LIMIT, coHostAddError } from "./co-host";

test("only the signed-in primary host can add or remove a co-host", () => {
  assert.equal(canManageCoHosts("host@example.com", "host@example.com"), true);
  assert.equal(canManageCoHosts("Host@Example.com", "host@example.com"), true);
  assert.equal(canManageCoHosts("cohost@example.com", "host@example.com"), false);
  assert.equal(canManageCoHosts(null, "host@example.com"), false);
  assert.equal(canManageCoHosts("host@example.com", null), false);
  assert.equal(canChangeHostEmail("cohost@example.com", "host@example.com"), false);
  assert.equal(canChangeHostEmail("cohost@example.com", "host@example.com", "attacker@example.com", "session"), false);
});

test("a co-host email cannot be the primary host or a duplicate", () => {
  assert.equal(
    coHostAddError({
      email: "Ana@example.com",
      hostEmail: "host@example.com",
      existing: [],
    }),
    null,
  );
  assert.match(
    coHostAddError({ email: "host@example.com", hostEmail: "Host@example.com", existing: [] }) ?? "",
    /host email/,
  );
  assert.match(
    coHostAddError({
      email: "ana@example.com",
      hostEmail: "host@example.com",
      existing: ["Ana@example.com"],
    }) ?? "",
    /already added/,
  );
  assert.match(
    coHostAddError({ email: "not-an-email", hostEmail: "host@example.com", existing: [] }) ?? "",
    /valid email/,
  );
  const full = Array.from({ length: COHOST_LIMIT }, (_, i) => `co${i}@example.com`);
  assert.match(
    coHostAddError({ email: "extra@example.com", hostEmail: "host@example.com", existing: full }) ?? "",
    /co-hosts/,
  );
});
