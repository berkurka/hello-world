import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetAllows,
  dailyEmailLimit,
  dailyLimitMessage,
  isDailyQuotaError,
  utcDayStart,
} from "./email-budget";

function env(values: Record<string, string> = {}): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

test("daily cap defaults to 100 and can be raised or turned off", () => {
  assert.equal(dailyEmailLimit(env()), 100);
  assert.equal(dailyEmailLimit(env({ MAIL_DAILY_LIMIT: "300" })), 300);
  assert.equal(dailyEmailLimit(env({ MAIL_DAILY_LIMIT: "0" })), null);
  assert.equal(dailyEmailLimit(env({ MAIL_DAILY_LIMIT: "unlimited" })), null);
  assert.equal(dailyEmailLimit(env({ MAIL_DAILY_LIMIT: "nope" })), 100);
});

test("budget blocks a batch that would pass the daily limit", () => {
  assert.deepEqual(budgetAllows(98, 2, 100), { ok: true, remaining: 2 });
  assert.deepEqual(budgetAllows(99, 2, 100), { ok: false, remaining: 1 });
  assert.deepEqual(budgetAllows(100, 1, 100), { ok: false, remaining: 0 });
  assert.deepEqual(budgetAllows(100, 5, null), { ok: true, remaining: null });
});

test("utc day starts at midnight", () => {
  assert.equal(utcDayStart(new Date("2026-10-04T23:30:00.000Z")), "2026-10-04T00:00:00.000Z");
});

test("daily quota errors become plain language and testing-sender errors do not", () => {
  assert.equal(
    isDailyQuotaError("450 You have reached your daily email sending quota."),
    true,
  );
  assert.equal(isDailyQuotaError("You can only send testing emails to your own email address."), false);
  assert.equal(isDailyQuotaError("Too many requests. You can only make 2 requests per second."), false);
  assert.equal(isDailyQuotaError("Mailbox quota exceeded"), false);
  assert.match(dailyLimitMessage(100, 0), /None are left today/);
  assert.match(dailyLimitMessage(100, 4), /4 are left today/);
});
