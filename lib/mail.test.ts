import assert from "node:assert/strict";
import test from "node:test";
import type { EventRow, InviteeRow } from "./types";
import { buildInviteMail, hostDisplayName, hostFromHeader, mailConfigFrom, mailConfigured, mailFromHeader, providerErrorMessage } from "./mail";

const resend = {
  SMTP_HOST: "smtp.resend.com",
  SMTP_USER: "resend",
  SMTP_PASS: "re_test_key",
  MAIL_FROM: "onboarding@resend.dev",
  FROM_NAME: "Partyz",
};

test("uses generic SMTP when the SMTP set is present", () => {
  const config = mailConfigFrom(resend);
  assert.deepEqual(config, {
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    user: "resend",
    pass: "re_test_key",
    from: "onboarding@resend.dev",
  });
  assert.equal(mailConfigured(resend), true);
  assert.equal(mailFromHeader(resend), `"Partyz" <onboarding@resend.dev>`);
});

test("SMTP_PORT defaults to 465 and is secure only on 465", () => {
  assert.equal(mailConfigFrom({ ...resend, SMTP_PORT: "" })?.port, 465);
  assert.equal(mailConfigFrom({ ...resend, SMTP_PORT: "465" })?.secure, true);
  const startTls = mailConfigFrom({ ...resend, SMTP_PORT: "587" });
  assert.equal(startTls?.port, 587);
  assert.equal(startTls?.secure, false);
});

test("prefers SMTP over legacy Gmail when both are set", () => {
  const config = mailConfigFrom({
    ...resend,
    GMAIL_USER: "you@gmail.com",
    GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
  });
  assert.equal(config?.host, "smtp.resend.com");
  assert.equal(config?.from, "onboarding@resend.dev");
});

test("falls back to Gmail when the SMTP set is incomplete", () => {
  const env = {
    SMTP_HOST: "smtp.resend.com",
    SMTP_USER: "resend",
    GMAIL_USER: "you@gmail.com",
    GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
    FROM_NAME: "Host",
  };
  const config = mailConfigFrom(env);
  assert.deepEqual(config, {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: "you@gmail.com",
    pass: "abcd efgh ijkl mnop",
    from: "you@gmail.com",
  });
  assert.equal(mailFromHeader(env), `"Host" <you@gmail.com>`);
});

test("mail is not configured when neither SMTP nor Gmail is complete", () => {
  assert.equal(mailConfigFrom({}), null);
  assert.equal(mailConfigured({}), false);
  assert.equal(mailConfigured({ SMTP_HOST: "smtp.resend.com", MAIL_FROM: "a@b.co" }), false);
  assert.equal(mailFromHeader({}), null);
});

test("invite mail is from the host via Partyz", () => {
  assert.equal(hostFromHeader("Bernardo", resend), `"Bernardo via Partyz" <onboarding@resend.dev>`);
  assert.equal(hostFromHeader("Bob\n\"via\"", resend), `"Bob via via Partyz" <onboarding@resend.dev>`);
  assert.equal(hostFromHeader("Ann<boss>@evil\\x", resend), `"Ann boss evil x via Partyz" <onboarding@resend.dev>`);
  assert.equal(hostDisplayName("A".repeat(80)).length <= 60, true);
  assert.equal(hostFromHeader("  ", resend), `"Partyz" <onboarding@resend.dev>`);
  assert.equal(hostFromHeader("Bernardo", {}), null);
});

test("invite messages reply to the host and preview the party", () => {
  const event = {
    title: "Maya's 7th Birthday",
    host_name: "Bernardo",
    host_email: "host@example.com",
    starts_at: "2026-10-17T14:00",
    ends_at: null,
    location: "Riverside Park",
    timezone: "America/New_York",
    host_email_verified_at: "2026-10-04T00:00:00.000Z",
  } as EventRow;
  const invitee = { display_name: "Priya", token: "abc" } as InviteeRow;
  const message = buildInviteMail({
    event,
    invitee,
    rsvpLink: "https://example.com/rsvp/abc",
  });
  assert.equal(message.subject, "Bernardo invited you to Maya's 7th Birthday");
  assert.equal(message.replyTo, "host@example.com");
  assert.match(message.text, /Sat, Oct 17 · 2:00 PM · Riverside Park/);
  assert.match(message.html, /display:none/);
  assert.match(message.text, /\/rsvp\/abc\/event\.ics/);
  assert.match(message.text, /calendar\.google\.com/);
  assert.doesNotMatch(message.text, /calendar\.google\.com[^\n]*rsvp/i);
  assert.doesNotMatch(message.text, /outlook\.live\.com[^\n]*rsvp/i);
  assert.match(message.text, /maps/);
  const unverified = buildInviteMail({
    event: { ...event, host_email_verified_at: null },
    invitee,
    rsvpLink: "https://example.com/rsvp/abc",
  });
  assert.equal(unverified.replyTo, undefined);
});

test("provider errors keep the SMTP response text", () => {
  const response =
    "450 You can only send testing emails to your own email address (you@example.com).";
  assert.equal(providerErrorMessage({ response, message: "Invalid recipients" }), response);
  assert.equal(providerErrorMessage(new Error("connect ECONNREFUSED")), "connect ECONNREFUSED");
});
