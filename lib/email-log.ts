import { countRows, run } from "./db";
import { newId } from "./ids";
import {
  EmailQuotaError,
  budgetAllows,
  dailyEmailLimit,
  dailyLimitMessage,
  utcDayStart,
} from "./email-budget";

export async function countEmailsSentToday(now = new Date()) {
  return countRows(`SELECT COUNT(*) AS n FROM email_sends WHERE created_at >= ?`, [utcDayStart(now)]);
}

export async function recordEmailSend(recipient: string, kind: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await run(`DELETE FROM email_sends WHERE created_at < ?`, [cutoff]);
  await run(`INSERT INTO email_sends (id, recipient, kind, created_at) VALUES (?, ?, ?, ?)`, [
    newId(),
    recipient,
    kind,
    now.toISOString(),
  ]);
}

/** Claims one daily slot before a send. Returns null when the cap is full. */
export async function reserveEmailSend(recipient: string, kind: string, now = new Date()) {
  const limit = dailyEmailLimit();
  const id = newId();
  const created = now.toISOString();
  const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await run(`DELETE FROM email_sends WHERE created_at < ?`, [cutoff]);
  if (limit === null) {
    await run(`INSERT INTO email_sends (id, recipient, kind, created_at) VALUES (?, ?, ?, ?)`, [
      id,
      recipient,
      kind,
      created,
    ]);
    return id;
  }
  const result = await run(
    `INSERT INTO email_sends (id, recipient, kind, created_at)
     SELECT ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM email_sends WHERE created_at >= ?) < ?`,
    [id, recipient, kind, created, utcDayStart(now), limit],
  );
  if (Number(result.rowsAffected) < 1) return null;
  return id;
}

export async function releaseEmailSend(id: string) {
  await run(`DELETE FROM email_sends WHERE id = ?`, [id]);
}

export async function assertDailyBudget(additional: number) {
  const limit = dailyEmailLimit();
  if (limit === null || additional <= 0) return;
  const sent = await countEmailsSentToday();
  const check = budgetAllows(sent, additional, limit);
  if (!check.ok) throw new EmailQuotaError(dailyLimitMessage(limit, check.remaining));
}
