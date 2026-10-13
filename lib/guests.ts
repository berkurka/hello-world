import { newId, newToken } from "./ids";
import {
  batchWrite,
  countRows,
  emailsUsedOnEvent,
  getInviteeForEvent,
  insertInvitee,
  run,
} from "./db";
import { asCount, isEmail, normalizeStoredEmail, parseAttending, storesHeadcount } from "./format";
import {
  applyExistingEmails,
  parseInviteeCsv,
  summarizeInviteeImport,
} from "./invitee-csv";
import {
  REMINDER_COOLDOWN_MS,
  SHARE_JOIN_EVENT_LIMIT,
  SHARE_JOIN_LIMIT,
  SHARE_JOIN_WINDOW_MS,
  parseShareCap,
} from "./guest-list";
import type { EventRow } from "./types";

export async function importInviteesFromText(eventId: string, text: string) {
  const plan = applyExistingEmails(parseInviteeCsv(text), await emailsUsedOnEvent(eventId));
  let added = 0;
  for (const row of plan.toAdd) {
    try {
      await insertInvitee(eventId, row.email, row.displayName, row.email2);
      added += 1;
    } catch {
      plan.skips.push({ line: row.line, reason: "already on this event" });
    }
  }
  plan.skips.sort((a, b) => a.line - b.line);
  return { added, summary: summarizeInviteeImport(added, plan.skips) };
}

export async function updateGuestContact(
  eventId: string,
  inviteeId: string,
  input: { displayName: string; email: string; email2: string },
): Promise<{ ok: true } | { error: string }> {
  const invitee = await getInviteeForEvent(eventId, inviteeId);
  if (!invitee) return { error: "Guest not found." };
  const displayName = input.displayName.trim();
  const email = normalizeStoredEmail(input.email) ?? "";
  const email2 = normalizeStoredEmail(input.email2);
  if (!displayName) return { error: "Need a family or guest name." };
  if (displayName.length > 120) return { error: "That name is too long." };
  const linkGuest = invitee.joined_via === "link";
  if (!linkGuest && !email) return { error: "Need a valid email." };
  if (email && !isEmail(email)) return { error: "Need a valid email." };
  if (email2 && !isEmail(email2)) return { error: "Second email is not valid." };
  if (email2 && email2 === email) return { error: "The two emails are the same." };
  const taken = await emailsUsedOnEvent(eventId, inviteeId);
  if ((email && taken.has(email)) || (email2 && taken.has(email2))) {
    return { error: "That email is already used on this event." };
  }
  await run(`UPDATE invitees SET display_name = ?, email = ?, email2 = ? WHERE id = ? AND event_id = ?`, [
    displayName,
    email,
    email2,
    inviteeId,
    eventId,
  ]);
  return { ok: true as const };
}

export async function removeGuest(eventId: string, inviteeId: string) {
  const invitee = await getInviteeForEvent(eventId, inviteeId);
  if (!invitee) return { error: "Guest not found." };
  await batchWrite([
    { sql: `DELETE FROM rsvps WHERE invitee_id = ?`, args: [inviteeId] },
    { sql: `DELETE FROM invitees WHERE id = ? AND event_id = ?`, args: [inviteeId, eventId] },
  ]);
  return { ok: true as const };
}

export async function upsertRsvp(
  inviteeId: string,
  fields: {
    attending: number;
    comment: string | null;
    adults: number;
    kids: number;
    infants: number;
    enteredByHost: boolean;
  },
) {
  const now = new Date().toISOString();
  const flag = fields.enteredByHost ? 1 : 0;
  await run(
    `INSERT INTO rsvps (id, invitee_id, attending, comment, adults, kids, infants, updated_at, entered_by_host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(invitee_id) DO UPDATE SET
       attending = excluded.attending,
       comment = excluded.comment,
       adults = excluded.adults,
       kids = excluded.kids,
       infants = excluded.infants,
       updated_at = excluded.updated_at,
       entered_by_host = excluded.entered_by_host`,
    [
      newId(),
      inviteeId,
      fields.attending,
      fields.comment,
      fields.adults,
      fields.kids,
      fields.infants,
      now,
      flag,
    ],
  );
}

export function rsvpFieldsFromForm(
  event: Pick<EventRow, "ask_comment" | "ask_adults" | "ask_kids" | "ask_infants">,
  input: { attending: number; comment: string; adults: string; kids: string; infants: string },
) {
  const keepCounts = storesHeadcount(input.attending);
  return {
    attending: input.attending,
    comment: event.ask_comment ? input.comment.trim() || null : null,
    adults: keepCounts && event.ask_adults ? asCount(input.adults) : 0,
    kids: keepCounts && event.ask_kids ? asCount(input.kids) : 0,
    infants: keepCounts && event.ask_infants ? asCount(input.infants) : 0,
  };
}

export async function recordHostRsvp(
  event: EventRow,
  inviteeId: string,
  input: { attendingRaw: string; comment: string; adults: string; kids: string; infants: string },
) {
  const invitee = await getInviteeForEvent(event.id, inviteeId);
  if (!invitee) return { error: "Guest not found." };
  const allowMaybe = event.allow_maybe !== 0;
  const attending = parseAttending(input.attendingRaw, allowMaybe);
  if (attending === null) {
    return { error: allowMaybe ? "Choose yes, maybe, or no." : "Choose yes or no." };
  }
  await upsertRsvp(inviteeId, {
    ...rsvpFieldsFromForm(event, { ...input, attending }),
    enteredByHost: true,
  });
  return { ok: true as const };
}

export async function clearGuestRsvp(eventId: string, inviteeId: string) {
  const invitee = await getInviteeForEvent(eventId, inviteeId);
  if (!invitee) return { error: "Guest not found." };
  await run(`DELETE FROM rsvps WHERE invitee_id = ?`, [inviteeId]);
  return { ok: true as const };
}

export async function rotateGuestLink(
  eventId: string,
  inviteeId: string,
): Promise<{ ok: true; token: string } | { error: string }> {
  const invitee = await getInviteeForEvent(eventId, inviteeId);
  if (!invitee) return { error: "Guest not found." };
  const token = newToken();
  await run(`UPDATE invitees SET token = ? WHERE id = ? AND event_id = ?`, [token, inviteeId, eventId]);
  return { ok: true as const, token };
}

/** Claims the 24-hour reminder slot. A second click in that window changes no row. */
export async function markReminded(inviteeId: string, when = new Date().toISOString()) {
  const cutoff = new Date(new Date(when).getTime() - REMINDER_COOLDOWN_MS).toISOString();
  const result = await run(
    `UPDATE invitees SET last_reminded_at = ?
     WHERE id = ? AND (last_reminded_at IS NULL OR last_reminded_at <= ?)`,
    [when, inviteeId, cutoff],
  );
  return Number(result.rowsAffected) > 0;
}

export async function restoreReminded(inviteeId: string, previous: string | null) {
  await run(`UPDATE invitees SET last_reminded_at = ? WHERE id = ?`, [previous, inviteeId]);
}

export async function saveShareSettings(
  eventId: string,
  input: { enabled: boolean; capRaw: string; currentToken: string | null; wasEnabled?: boolean },
) {
  const parsed = parseShareCap(input.capRaw);
  if ("error" in parsed) return parsed;
  let token = input.currentToken;
  const turningOn = input.enabled && input.wasEnabled === false;
  if (turningOn || (input.enabled && !token)) token = newToken();
  await run(`UPDATE events SET share_enabled = ?, share_cap = ?, share_token = ? WHERE id = ?`, [
    input.enabled ? 1 : 0,
    parsed.cap,
    token,
    eventId,
  ]);
  return { ok: true as const, token, rotated: Boolean(token && token !== input.currentToken) };
}

export async function rotateShareLink(eventId: string) {
  const token = newToken();
  await run(`UPDATE events SET share_token = ?, share_enabled = 1 WHERE id = ?`, [token, eventId]);
  return token;
}

export async function countLinkJoins(eventId: string) {
  return countRows(`SELECT COUNT(*) AS n FROM invitees WHERE event_id = ? AND joined_via = 'link'`, [
    eventId,
  ]);
}

async function claimShareAttempt(eventId: string, ip: string, now: Date): Promise<{ id: string } | { error: string }> {
  const cutoff = new Date(now.getTime() - SHARE_JOIN_WINDOW_MS * 2).toISOString();
  await run(`DELETE FROM share_join_attempts WHERE event_id = ? AND created_at < ?`, [eventId, cutoff]);
  const since = new Date(now.getTime() - SHARE_JOIN_WINDOW_MS).toISOString();
  const id = newId();
  const result = await run(
    `INSERT INTO share_join_attempts (id, event_id, ip, created_at)
     SELECT ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM share_join_attempts WHERE event_id = ? AND ip = ? AND created_at >= ?) < ?
       AND (SELECT COUNT(*) FROM share_join_attempts WHERE event_id = ? AND created_at >= ?) < ?`,
    [
      id,
      eventId,
      ip,
      now.toISOString(),
      eventId,
      ip,
      since,
      SHARE_JOIN_LIMIT,
      eventId,
      since,
      SHARE_JOIN_EVENT_LIMIT,
    ],
  );
  if (Number(result.rowsAffected) < 1) {
    const ipCount = await countRows(
      `SELECT COUNT(*) AS n FROM share_join_attempts WHERE event_id = ? AND ip = ? AND created_at >= ?`,
      [eventId, ip, since],
    );
    if (ipCount >= SHARE_JOIN_LIMIT) {
      return {
        error:
          "Too many sign-ups from this network in the last hour. Ask the host to add you, or try again later.",
      };
    }
    return {
      error: "Too many sign-ups on this party link in the last hour. Ask the host to add you, or try again later.",
    };
  }
  return { id };
}

export async function joinFromShare(opts: {
  event: EventRow;
  displayName: string;
  email: string;
  attendingRaw: string;
  comment: string;
  adults: string;
  kids: string;
  infants: string;
  ip: string;
  now?: Date;
}): Promise<{ token: string } | { error: string }> {
  const now = opts.now ?? new Date();
  if (opts.event.share_enabled !== 1 || !opts.event.share_token) {
    return { error: "This party link is turned off." };
  }
  const displayName = opts.displayName.trim();
  if (!displayName) return { error: "Name is required." };
  if (displayName.length > 120) return { error: "That name is too long." };
  const email = normalizeStoredEmail(opts.email) ?? "";
  if (email && !isEmail(email)) return { error: "That email is not valid." };
  const allowMaybe = opts.event.allow_maybe !== 0;
  const attending = parseAttending(opts.attendingRaw, allowMaybe);
  if (attending === null) {
    return { error: allowMaybe ? "Please choose yes, maybe, or no." : "Please choose yes or no." };
  }

  const attempt = await claimShareAttempt(opts.event.id, opts.ip, now);
  if ("error" in attempt) return attempt;

  // Spend the attempt before answering, so this check cannot probe the guest list for free.
  if (email) {
    const taken = await emailsUsedOnEvent(opts.event.id);
    if (taken.has(email)) return { error: "That email is already on this guest list." };
  }

  const inviteeId = newId();
  const token = newToken();
  const createdAt = now.toISOString();
  const cap = opts.event.share_cap;
  let inserted = 0;
  try {
    const result = await run(
      `INSERT INTO invitees (id, event_id, email, email2, display_name, token, invited_at, created_at, joined_via)
       SELECT ?, ?, ?, NULL, ?, ?, NULL, ?, 'link'
       WHERE (? IS NULL OR (SELECT COUNT(*) FROM invitees WHERE event_id = ? AND joined_via = 'link') < ?)`,
      [inviteeId, opts.event.id, email, displayName, token, createdAt, cap, opts.event.id, cap],
    );
    inserted = Number(result.rowsAffected);
  } catch {
    await run(`DELETE FROM share_join_attempts WHERE id = ?`, [attempt.id]);
    return { error: "That email is already on this guest list." };
  }
  if (inserted < 1) {
    await run(`DELETE FROM share_join_attempts WHERE id = ?`, [attempt.id]);
    return { error: "This party has reached its sign-up limit." };
  }
  try {
    await upsertRsvp(inviteeId, {
      ...rsvpFieldsFromForm(opts.event, {
        attending,
        comment: opts.comment,
        adults: opts.adults,
        kids: opts.kids,
        infants: opts.infants,
      }),
      enteredByHost: false,
    });
  } catch {
    await batchWrite([
      { sql: `DELETE FROM rsvps WHERE invitee_id = ?`, args: [inviteeId] },
      { sql: `DELETE FROM invitees WHERE id = ?`, args: [inviteeId] },
      { sql: `DELETE FROM share_join_attempts WHERE id = ?`, args: [attempt.id] },
    ]);
    return { error: "Could not save that RSVP. Try again." };
  }
  return { token };
}
