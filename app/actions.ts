"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { hostEmailChangeUrl, hostLoginUrl, rsvpUrl } from "@/lib/app-url";
import { isValidTimeZone, resolveEndsAt } from "@/lib/calendar";
import {
  deleteEventImage,
  emailsUsedOnEvent,
  getEvent,
  getInviteeByToken,
  getRsvp,
  insertInvitee,
  listInvitees,
  run,
  saveEventImage,
} from "@/lib/db";
import { asBool, asCount, isEmail, normalizeStoredEmail, parseAttending, storesHeadcount } from "@/lib/format";
import {
  attachHostEmail,
  authorizeOrganizer,
  canChangeHostEmail,
  deleteSession,
  issueEmailChange,
  issueHostLogin,
  issueLoginToken,
  redeemEmailChange,
  redeemHostLogin,
  revokeDeviceToken,
  revokeEmailChangeToken,
  rotateDashboardSecrets,
  sessionEmailFromToken,
  startSession,
  type HostAccess,
} from "@/lib/host-login";
import { appendSendError, familyInviteNotice, friendlyMailError, unsentBatchNotice } from "@/lib/invite-delivery";
import { newId, newToken } from "@/lib/ids";
import {
  applyExistingEmails,
  INVITEE_CSV_MAX_BYTES,
  parseInviteeCsv,
  summarizeInviteeImport,
} from "@/lib/invitee-csv";
import {
  GENERIC_MAIL_ERROR,
  mailConfigured,
  providerErrorMessage,
  sendHostEmailChangeEmail,
  sendHostEmailChangeNotice,
  sendHostSignInEmail,
  sendInviteEmail,
} from "@/lib/mail";
import { goingNeedsPeople } from "@/lib/party-stats";
import { inspectPartyImage } from "@/lib/party-image";
import { themeById } from "@/lib/themes";
import {
  clearDeviceCookie,
  clearSessionCookie,
  readClientIp,
  readHostCreds,
  rememberCreatedParty,
  writeSessionCookie,
} from "@/lib/request-auth";

function required(formData: FormData, key: string) {
  for (const value of formData.getAll(key)) {
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

async function requireOrganizer(formData: FormData) {
  const eventId = required(formData, "eventId");
  const token = required(formData, "t");
  const auth = await authorizeOrganizer(eventId, token || null, await readHostCreds());
  if (!auth) throw new Error("Event not found");
  return auth;
}

function firstMatch(formData: FormData, key: string, re: RegExp) {
  for (const value of formData.getAll(key)) {
    const text = String(value).trim();
    if (re.test(text)) return text;
  }
  return "";
}

type PartyImageInput =
  | { kind: "none" }
  | { kind: "remove" }
  | { kind: "file"; mime: string; data: string }
  | { kind: "error"; error: string };

async function readPartyImageInput(formData: FormData): Promise<PartyImageInput> {
  if (asBool(formData.get("removePartyImage"))) return { kind: "remove" };
  const file = formData.get("partyImage");
  if (!(file instanceof File) || file.size === 0) return { kind: "none" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectPartyImage(bytes, file.type, file.size);
  if (!inspected.ok) return { kind: "error", error: inspected.error };
  return { kind: "file", mime: inspected.mime, data: Buffer.from(bytes).toString("base64") };
}

function eventFields(formData: FormData) {
  const title = required(formData, "title");
  const startsDate = firstMatch(formData, "startsDate", /^\d{4}-\d{2}-\d{2}$/);
  const startsTimeRaw = firstMatch(formData, "startsTime", /^\d{2}:\d{2}/);
  const startsTime = startsTimeRaw.slice(0, 5);
  const startsAt = startsDate && startsTime ? `${startsDate}T${startsTime}` : "";
  const endsTimeRaw = firstMatch(formData, "endsTime", /^\d{2}:\d{2}/);
  const endsTime = endsTimeRaw.slice(0, 5);
  const location = required(formData, "location");
  const notes = required(formData, "notes").slice(0, 2000);
  const hostName = required(formData, "hostName");
  const timezoneRaw = required(formData, "timezone");
  const timezone = isValidTimeZone(timezoneRaw) ? timezoneRaw : null;
  return {
    title,
    startsAt,
    endsAt: startsAt ? resolveEndsAt(startsAt, endsTime) : null,
    endsTime,
    location,
    notes,
    hostName,
    timezone,
    theme: themeById(required(formData, "theme")).id,
    allowMaybe: asBool(formData.get("allowMaybe")) ? 1 : 0,
    askComment: asBool(formData.get("askComment")) ? 1 : 0,
    askAdults: asBool(formData.get("askAdults")) ? 1 : 0,
    askKids: asBool(formData.get("askKids")) ? 1 : 0,
    askInfants: asBool(formData.get("askInfants")) ? 1 : 0,
  };
}

function endBeforeStart(startsAt: string, endsTime: string) {
  if (!startsAt || !endsTime) return false;
  return `${startsAt.slice(0, 10)}T${endsTime}` <= startsAt;
}

export async function createEvent(formData: FormData) {
  const fields = eventFields(formData);
  const hostEmail = required(formData, "hostEmail").toLowerCase();
  if (!fields.title) {
    return { error: "Title is required." };
  }
  if (!fields.startsAt) {
    return { error: "Date and time are required." };
  }
  if (endBeforeStart(fields.startsAt, fields.endsTime)) {
    return { error: "End time must be after the start time." };
  }
  if (!fields.hostName) {
    return { error: "Host name is required." };
  }
  if (!isEmail(hostEmail)) {
    return { error: "Host email is required." };
  }
  const image = await readPartyImageInput(formData);
  if (image.kind === "error") return { error: image.error };
  const id = newId();
  const adminToken = newToken();
  const hostClaimToken = newToken();
  const now = new Date().toISOString();
  await run(
    `INSERT INTO events (
      id, admin_token, title, starts_at, ends_at, location, notes, host_name, host_email,
      host_claim_token, host_claimed_at, ask_comment, ask_adults, ask_kids, ask_infants,
      allow_maybe, party_image_mime, theme, timezone, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    [
      id,
      adminToken,
      fields.title,
      fields.startsAt,
      fields.endsAt,
      fields.location,
      fields.notes,
      fields.hostName,
      hostEmail,
      hostClaimToken,
      fields.askComment,
      fields.askAdults,
      fields.askKids,
      fields.askInfants,
      fields.allowMaybe,
      fields.theme,
      fields.timezone,
      now,
      now,
    ],
  );
  if (image.kind === "file") {
    await saveEventImage(id, image.mime, image.data);
  }
  await rememberCreatedParty(id);

  let mail: "sent" | "skipped" | "failed" = "skipped";
  if (mailConfigured()) {
    const issued = await issueLoginToken(hostEmail, "create", await readClientIp());
    if (issued.status === "limited") {
      mail = "failed";
    } else {
      try {
        await sendHostSignInEmail({
          to: hostEmail,
          link: hostLoginUrl(issued.token),
          hostName: fields.hostName,
          titles: [fields.title],
          kind: "create",
        });
        mail = "sent";
      } catch (err) {
        console.error("host create email failed", providerErrorMessage(err));
        mail = "failed";
      }
    }
  }

  const created = new URLSearchParams({ t: adminToken, welcome: "1", mail });
  redirect(`/e/${id}/manage?${created.toString()}`);
}

export async function updateEvent(formData: FormData) {
  const { event, access } = await requireOrganizer(formData);
  const fields = eventFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }
  if (!fields.startsAt) {
    return { error: "Date and time are required." };
  }
  if (endBeforeStart(fields.startsAt, fields.endsTime)) {
    return { error: "End time must be after the start time." };
  }
  if (!fields.hostName) {
    return { error: "Host name is required." };
  }
  const image = await readPartyImageInput(formData);
  if (image.kind === "error") return { error: image.error };
  await run(
    `UPDATE events
     SET title = ?, starts_at = ?, ends_at = ?, location = ?, notes = ?, host_name = ?,
         ask_comment = ?, ask_adults = ?, ask_kids = ?, ask_infants = ?, allow_maybe = ?,
         theme = ?, timezone = COALESCE(timezone, ?), updated_at = ?
     WHERE id = ?`,
    [
      fields.title,
      fields.startsAt,
      fields.endsAt,
      fields.location,
      fields.notes,
      fields.hostName,
      fields.askComment,
      fields.askAdults,
      fields.askKids,
      fields.askInfants,
      fields.allowMaybe,
      fields.theme,
      fields.timezone,
      new Date().toISOString(),
      event.id,
    ],
  );
  if (image.kind === "file") {
    await saveEventImage(event.id, image.mime, image.data);
  } else if (image.kind === "remove") {
    await deleteEventImage(event.id);
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(managePath(event, { notice: "Event updated." }, access));
}

function managePath(
  event: { id: string; admin_token: string },
  flash: { notice?: string; error?: string },
  access: HostAccess,
) {
  const params = new URLSearchParams();
  if (access === "token") params.set("t", event.admin_token);
  if (flash.notice) params.set("notice", flash.notice);
  if (flash.error) params.set("error", flash.error);
  const qs = params.toString();
  return qs ? `/e/${event.id}/manage?${qs}` : `/e/${event.id}/manage`;
}

export async function addInvitee(formData: FormData) {
  const { event, access } = await requireOrganizer(formData);
  const email = normalizeStoredEmail(required(formData, "email"));
  const email2 = normalizeStoredEmail(required(formData, "email2"));
  const displayName = required(formData, "displayName");
  if (!displayName || !email || !isEmail(email)) {
    redirect(managePath(event, { error: "Need a family or guest name and a valid email." }, access));
  }
  if (email2 && !isEmail(email2)) {
    redirect(managePath(event, { error: "Second email is not valid." }, access));
  }
  if (email2 && email2 === email) {
    redirect(managePath(event, { error: "The two emails are the same." }, access));
  }
  const taken = await emailsUsedOnEvent(event.id);
  if (taken.has(email) || (email2 && taken.has(email2))) {
    redirect(managePath(event, { error: "That email is already used on this event." }, access));
  }
  try {
    await insertInvitee(event.id, email, displayName, email2);
  } catch {
    redirect(managePath(event, { error: "That email is already used on this event." }, access));
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(managePath(event, { notice: "Invitee added." }, access));
}

export async function importInvitees(formData: FormData) {
  const { event, access } = await requireOrganizer(formData);
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect(managePath(event, { error: "Choose a CSV file to import." }, access));
  }
  if (file.size > INVITEE_CSV_MAX_BYTES) {
    redirect(managePath(event, { error: "That file is too large. Use a CSV under 256 KB." }, access));
  }
  const text = await file.text();
  const plan = applyExistingEmails(parseInviteeCsv(text), await emailsUsedOnEvent(event.id));
  let added = 0;
  for (const row of plan.toAdd) {
    try {
      await insertInvitee(event.id, row.email, row.displayName, row.email2);
      added += 1;
    } catch {
      plan.skips.push({ line: row.line, reason: "already on this event" });
    }
  }
  plan.skips.sort((a, b) => a.line - b.line);
  const summary = summarizeInviteeImport(added, plan.skips);
  revalidatePath(`/e/${event.id}/manage`);
  if (added === 0) {
    redirect(managePath(event, { error: summary }, access));
  }
  redirect(managePath(event, { notice: summary }, access));
}

async function deliverInvite(eventId: string, inviteeId: string) {
  const event = await getEvent(eventId);
  if (!event) throw new Error("Event not found");
  const invitees = await listInvitees(eventId);
  const invitee = invitees.find((row) => row.id === inviteeId);
  if (!invitee) throw new Error("Invitee not found");
  if (!mailConfigured()) {
    console.error("Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM.");
    throw new Error("Email sending isn't available right now.");
  }
  const delivery = await sendInviteEmail({
    event,
    invitee,
    rsvpLink: rsvpUrl(invitee.token),
  });
  if (delivery.sent.length > 0) {
    await run(`UPDATE invitees SET invited_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      invitee.id,
    ]);
  }
  return delivery;
}

export async function sendInvite(formData: FormData) {
  const { event, access } = await requireOrganizer(formData);
  const inviteeId = required(formData, "inviteeId");
  let delivery;
  try {
    delivery = await deliverInvite(event.id, inviteeId);
  } catch (err) {
    redirect(managePath(event, { error: friendlyMailError(err) }, access));
  }
  revalidatePath(`/e/${event.id}/manage`);
  if (delivery.sent.length === 0) {
    const who = delivery.failed.join(", ");
    const base = who ? `Could not email ${who}.` : "Could not send invite.";
    redirect(managePath(event, { error: appendSendError(base, delivery.error) }, access));
  }
  redirect(
    managePath(
      event,
      {
        notice: appendSendError(familyInviteNotice(delivery.sent, delivery.failed), delivery.error),
      },
      access,
    ),
  );
}

export async function sendAllUnsent(formData: FormData) {
  const { event, access } = await requireOrganizer(formData);
  const invitees = await listInvitees(event.id);
  const pending = invitees.filter((row) => !row.invited_at);
  if (pending.length === 0) {
    redirect(managePath(event, { notice: "No unsent invites." }, access));
  }
  let sentFamilies = 0;
  const failed: string[] = [];
  const errors: string[] = [];
  let stopped: string | null = null;
  for (const invitee of pending) {
    try {
      const delivery = await deliverInvite(event.id, invitee.id);
      if (delivery.sent.length > 0) sentFamilies += 1;
      failed.push(...delivery.failed);
      if (delivery.error) errors.push(delivery.error);
    } catch (err) {
      stopped = friendlyMailError(err);
      break;
    }
  }
  revalidatePath(`/e/${event.id}/manage`);
  const sendError = [...new Set(errors)].join(" ");
  if (sentFamilies === 0) {
    const who = failed.join(", ");
    const base = stopped || (who ? `Could not email ${who}.` : "Could not send invites.");
    redirect(managePath(event, { error: appendSendError(base, sendError) }, access));
  }
  const notice = appendSendError(unsentBatchNotice(sentFamilies, failed), sendError);
  redirect(managePath(event, { notice: stopped ? `${notice} ${stopped}` : notice }, access));
}

export async function saveRsvp(formData: FormData) {
  const token = required(formData, "token");
  const invitee = await getInviteeByToken(token);
  if (!invitee) notFound();
  const event = await getEvent(invitee.event_id);
  if (!event) notFound();

  const attendingRaw = required(formData, "attending");
  const allowMaybe = event.allow_maybe !== 0;
  const attending = parseAttending(attendingRaw, allowMaybe);
  if (attending === null) {
    const message = allowMaybe ? "Please choose yes, maybe, or no." : "Please choose yes or no.";
    redirect(`/rsvp/${token}?error=` + encodeURIComponent(message));
  }
  const comment = event.ask_comment ? String(formData.get("comment") ?? "").trim() : "";
  const keepCounts = storesHeadcount(attending);
  const adults = keepCounts && event.ask_adults ? asCount(formData.get("adults")) : 0;
  const kids = keepCounts && event.ask_kids ? asCount(formData.get("kids")) : 0;
  const infants = keepCounts && event.ask_infants ? asCount(formData.get("infants")) : 0;
  if (keepCounts && goingNeedsPeople(event, adults, kids, infants)) {
    redirect(`/rsvp/${token}?error=` + encodeURIComponent("Add at least one person."));
  }

  const existing = await getRsvp(invitee.id);
  const now = new Date().toISOString();
  if (existing) {
    await run(
      `UPDATE rsvps SET attending = ?, comment = ?, adults = ?, kids = ?, infants = ?, updated_at = ? WHERE id = ?`,
      [attending, comment || null, adults, kids, infants, now, existing.id],
    );
  } else {
    await run(
      `INSERT INTO rsvps (id, invitee_id, attending, comment, adults, kids, infants, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), invitee.id, attending, comment || null, adults, kids, infants, now],
    );
  }
  revalidatePath(`/rsvp/${token}`);
  redirect(`/rsvp/${token}?done=1`);
}

export async function requestHostLogin(formData: FormData) {
  const email = normalizeStoredEmail(required(formData, "email"));
  if (!email || !isEmail(email)) redirect("/host/recover?error=email");
  if (!mailConfigured()) redirect("/host/recover?error=mail");
  const issued = await issueHostLogin(email, await readClientIp());
  if (issued.status === "sent") {
    const { token, titles } = issued;
    after(async () => {
      try {
        await sendHostSignInEmail({ to: email, link: hostLoginUrl(token), titles, kind: "recover" });
      } catch (err) {
        console.error("host sign-in email failed", providerErrorMessage(err));
      }
    });
  }
  redirect("/host/recover?sent=1");
}

export async function consumeHostLogin(formData: FormData) {
  const token = required(formData, "token");
  const email = await redeemHostLogin(token);
  if (!email) redirect("/host/login?error=expired");
  await writeSessionCookie(await startSession(email));
  redirect("/host");
}

export async function signOutHost() {
  const creds = await readHostCreds();
  await deleteSession(creds.sessionToken);
  await revokeDeviceToken(creds.deviceToken);
  await clearSessionCookie();
  await clearDeviceCookie();
  redirect("/");
}

export async function requestHostEmailChange(formData: FormData) {
  const creds = await readHostCreds();
  const { event, access } = await requireOrganizer(formData);
  const sessionEmail = await sessionEmailFromToken(creds.sessionToken);
  const email = normalizeStoredEmail(required(formData, "email"));
  if (!email || !isEmail(email)) {
    redirect(managePath(event, { error: "Enter a valid email." }, access));
  }
  if (!canChangeHostEmail(sessionEmail, event.host_email, email, access)) {
    const adding = !normalizeStoredEmail(event.host_email);
    redirect(
      managePath(
        event,
        {
          error: !adding
            ? "Sign in from the current host email to change it."
            : access !== "device"
              ? "Open this party from the browser that created it to add a recovery email."
              : "Sign in as that email to add it.",
        },
        access,
      ),
    );
  }
  if (!normalizeStoredEmail(event.host_email)) {
    if (access !== "device") {
      redirect(
        managePath(
          event,
          { error: "Open this party from the browser that created it to add a recovery email." },
          access,
        ),
      );
    }
    const attached = await attachHostEmail(event.id, email, access);
    if (!attached) {
      redirect(managePath(event, { error: "This party already has a host email." }, access));
    }
    revalidatePath(`/e/${event.id}/manage`);
    redirect(managePath(event, { notice: "Recovery email saved." }, access));
  }
  if (email === normalizeStoredEmail(event.host_email)) {
    redirect(managePath(event, { error: "That is already the host email." }, access));
  }
  if (!mailConfigured()) {
    redirect(managePath(event, { error: "Email is not set up, so the host email can't be changed." }, access));
  }
  const issued = await issueEmailChange(event.id, email, event.host_email);
  if (!issued.ok) redirect(managePath(event, { error: issued.error }, access));
  const oldEmail = normalizeStoredEmail(event.host_email);
  if (oldEmail) {
    try {
      await sendHostEmailChangeNotice({
        to: oldEmail,
        title: event.title,
        nextEmail: email,
      });
    } catch (err) {
      console.error("host email change notice failed", providerErrorMessage(err));
    }
  }
  try {
    await sendHostEmailChangeEmail({
      to: email,
      link: hostEmailChangeUrl(issued.token),
      title: event.title,
      hostName: event.host_name,
    });
  } catch (err) {
    console.error("host email change failed", providerErrorMessage(err));
    await revokeEmailChangeToken(issued.token);
    redirect(managePath(event, { error: GENERIC_MAIL_ERROR }, access));
  }
  redirect(
    managePath(
      event,
      { notice: `Confirmation sent to ${email}. The host email changes when that link is opened.` },
      access,
    ),
  );
}

export async function confirmHostEmail(formData: FormData) {
  const token = required(formData, "token");
  const changed = await redeemEmailChange(token);
  if (!changed) redirect("/host/email?error=expired");
  await writeSessionCookie(await startSession(changed.email));
  revalidatePath(`/e/${changed.eventId}/manage`);
  revalidatePath("/host");
  redirect(`/e/${changed.eventId}/manage?notice=` + encodeURIComponent("Host email updated."));
}

export async function resetDashboardLink(formData: FormData) {
  const { event } = await requireOrganizer(formData);
  const adminToken = await rotateDashboardSecrets(event.id);
  if (!adminToken) throw new Error("Event not found");
  revalidatePath(`/e/${event.id}/manage`);
  redirect(
    managePath(
      { id: event.id, admin_token: adminToken },
      { notice: "Dashboard link reset. Old links no longer work." },
      "token",
    ),
  );
}
