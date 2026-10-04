import assert from "node:assert/strict";
import test from "node:test";
import { sessionCookieOptions } from "./cookie-options";
import {
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  RECOVER_SENT_MESSAGE,
  SESSION_TTL_SECONDS,
  clientIpFromHeaders,
  hashToken,
  splitByStart,
  withinLoginLimits,
} from "./host-login";

test("login limits are 3 per email and 10 per IP", () => {
  assert.equal(LOGIN_EMAIL_LIMIT, 3);
  assert.equal(LOGIN_IP_LIMIT, 10);
  assert.equal(withinLoginLimits(0, 0), true);
  assert.equal(withinLoginLimits(2, 9), true);
  assert.equal(withinLoginLimits(3, 0), false);
  assert.equal(withinLoginLimits(0, 10), false);
});

test("sign-in sessions last 30 days and cookies stay httpOnly", () => {
  assert.equal(SESSION_TTL_SECONDS, 30 * 24 * 60 * 60);
  const options = sessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.maxAge, SESSION_TTL_SECONDS);
  assert.equal(options.path, "/");
});

test("tokens are stored as sha256 hashes", () => {
  const hash = hashToken("abc");
  assert.equal(hash.length, 64);
  assert.equal(hashToken("abc"), hash);
  assert.notEqual(hashToken("abd"), hash);
});

test("client IP uses the first forwarded address", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" });
  assert.equal(clientIpFromHeaders(headers), "203.0.113.8");
  assert.equal(clientIpFromHeaders(new Headers()), "unknown");
});

test("parties split into upcoming and past by wall-clock start", () => {
  const now = new Date(2026, 9, 4, 12, 0);
  const { upcoming, past } = splitByStart(
    [
      { id: "past", starts_at: "2026-10-01T18:00" },
      { id: "later", starts_at: "2026-10-04T18:00" },
      { id: "soon", starts_at: "2026-10-04T12:00" },
    ],
    now,
  );
  assert.deepEqual(
    upcoming.map((event) => event.id),
    ["later", "soon"],
  );
  assert.deepEqual(
    past.map((event) => event.id),
    ["past"],
  );
});

test("recovery copy does not reveal whether an email exists", () => {
  assert.match(RECOVER_SENT_MESSAGE, /If that email has parties/);
  assert.match(RECOVER_SENT_MESSAGE, /30 minutes/);
});
