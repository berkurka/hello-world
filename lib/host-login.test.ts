import assert from "node:assert/strict";
import test from "node:test";
import { sessionCookieOptions } from "./cookie-options";
import {
  CREATE_EMAIL_LIMIT,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  RECOVER_SENT_MESSAGE,
  SESSION_TTL_SECONDS,
  canChangeHostEmail,
  clientIpFromHeaders,
  hashToken,
  splitByStart,
  withinLoginLimits,
} from "./host-login";

test("login limits are 3 per email and 30 per IP", () => {
  assert.equal(LOGIN_EMAIL_LIMIT, 3);
  assert.equal(CREATE_EMAIL_LIMIT, 10);
  assert.equal(LOGIN_IP_LIMIT, 30);
  assert.equal(withinLoginLimits(0, 0), true);
  assert.equal(withinLoginLimits(2, 29), true);
  assert.equal(withinLoginLimits(3, 0), false);
  assert.equal(withinLoginLimits(0, 30), false);
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

test("client IP prefers the Vercel forwarded address", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "198.51.100.4, 10.0.0.2",
    "x-forwarded-for": "203.0.113.8, 10.0.0.1",
  });
  assert.equal(clientIpFromHeaders(headers), "198.51.100.4");
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" })), "203.0.113.8");
  assert.equal(clientIpFromHeaders(new Headers()), "unknown");
});

test("host email changes follow the signed-in address, including a dashboard link", () => {
  assert.equal(canChangeHostEmail("host@example.com", "host@example.com"), true);
  assert.equal(canChangeHostEmail("host@example.com", "Host@Example.com"), true);
  assert.equal(canChangeHostEmail("other@example.com", "host@example.com"), false);
  assert.equal(canChangeHostEmail(null, "host@example.com"), false);
  assert.equal(canChangeHostEmail("host@example.com", null), true);
  assert.equal(canChangeHostEmail("host@example.com", null, "host@example.com"), true);
  assert.equal(canChangeHostEmail("host@example.com", null, "Host@Example.com"), true);
  assert.equal(canChangeHostEmail("host@example.com", null, "other@example.com"), false);
  assert.equal(canChangeHostEmail(null, null, "host@example.com"), false);
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
