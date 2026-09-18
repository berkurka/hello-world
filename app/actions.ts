"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hostClaimUrl, rsvpUrl } from "@/lib/app-url";
import {
  getEvent,
  getEventForOrganizer,
  getInviteeByToken,
  getRsvp,
  listInvitees,
  run,
} from "@/lib/db";
import { asBool, asCount, isEmail } from "@/lib/format";
import { newId, newToken } from "@/lib/ids";
import { mailConfigured, sendHostClaimEmail, sendInviteEmail } from "@/lib/mail";

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
  const event = await getEventForOrganizer(eventId, token);
  if (!event) throw new Error("Event not found");
  return event;
}

function fieldErrorPath(formData: FormData, message: string) {
  const eventId = required(formData, "eventId");
  const token = required(formData, "t");
  if (eventId && token) {
    return `/e/${eventId}/manage?t=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`;
  }
  const params = new URLSearchParams();
  params.set("error", message);
  params.set("draft", "1");
  for (const key of ["title", "location", "hostName", "hostEmail", "startsDate", "startsTime"] as const) {
    const value = required(formData, key);
    if (value) params.set(key, value);
  }
  if (asBool(formData.get("askComment"))) params.set("askComment", "1");
  if (asBool(formData.get("askAdults"))) params.set("askAdults", "1");
  if (asBool(formData.get("askKids"))) params.set("askKids", "1");
  if (asBool(formData.get("askInfants"))) params.set("askInfants", "1");
  return `/?${params.toString()}`;
}

function firstMatch(formData: FormData, key: string, re: RegExp) {
  for (const value of formData.getAll(key)) {
    const text = String(value).trim();
    if (re.test(text)) return text;
  }
  return "";
}

function eventFields(formData: FormData) {
  const title = required(formData, "title");
  const startsDate = firstMatch(formData, "startsDate", /^\d{4}-\d{2}-\d{2}$/);
  const startsTimeRaw = firstMatch(formData, "startsTime", /^\d{2}:\d{2}/);
  const startsTime = startsTimeRaw.slice(0, 5);
  const startsAt = startsDate && startsTime ? `${startsDate}T${startsTime}` : "";
  const location = required(formData, "location");
  const hostName = required(formData, "hostName");
  return {
    title,
    startsAt,
    location,
    hostName,
    askComment: asBool(formData.get("askComment")) ? 1 : 0,
    askAdults: asBool(formData.get("askAdults")) ? 1 : 0,
    askKids: asBool(formData.get("askKids")) ? 1 : 0,
    askInfants: asBool(formData.get("askInfants")) ? 1 : 0,
  };
}

export async function createEvent(formData: FormData) {
  const fields = eventFields(formData);
  const hostEmail = required(formData, "hostEmail").toLowerCase();
  if (!fields.title) {
    const dest = fieldErrorPath(formData, "Title is required.");
    redirect(dest);
  }
  if (!fields.startsAt) {
    const dest = fieldErrorPath(formData, "Date and time are required.");
    redirect(dest);
  }
  if (!fields.hostName) {
    const dest = fieldErrorPath(formData, "Host name is required.");
    redirect(dest);
  }
  if (!isEmail(hostEmail)) {
    const dest = fieldErrorPath(formData, "Host email is required.");
    redirect(dest);
  }
  const id = newId();
  const adminToken = newToken();
  const hostClaimToken = newToken();
  await run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, host_claim_token, host_claimed_at, ask_comment, ask_adults, ask_kids, ask_infants, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    [
      id,
      adminToken,
      fields.title,
      fields.startsAt,
      fields.location,
      fields.hostName,
      hostEmail,
      hostClaimToken,
      fields.askComment,
      fields.askAdults,
      fields.askKids,
      fields.askInfants,
      new Date().toISOString(),
    ],
  );

  let mail: "sent" | "skipped" | "failed" = "skipped";
  if (mailConfigured()) {
    try {
      await sendHostClaimEmail({
        event: {
          id,
          admin_token: adminToken,
          title: fields.title,
          starts_at: fields.startsAt,
          location: fields.location,
          host_name: fields.hostName,
          host_email: hostEmail,
          host_claim_token: hostClaimToken,
          host_claimed_at: null,
          ask_comment: fields.askComment,
          ask_adults: fields.askAdults,
          ask_kids: fields.askKids,
          ask_infants: fields.askInfants,
          created_at: new Date().toISOString(),
        },
        hostEmail,
        claimLink: hostClaimUrl(hostClaimToken),
      });
      mail = "sent";
    } catch {
      mail = "failed";
    }
  }

  redirect(`/e/${id}/created?t=${encodeURIComponent(adminToken)}&mail=${mail}`);
}

export async function updateEvent(formData: FormData) {
  const event = await requireOrganizer(formData);
  const fields = eventFields(formData);
  if (!fields.title) {
    redirect(fieldErrorPath(formData, "Title is required."));
  }
  if (!fields.startsAt) {
    redirect(fieldErrorPath(formData, "Date and time are required."));
  }
  if (!fields.hostName) {
    redirect(fieldErrorPath(formData, "Host name is required."));
  }
  await run(
    `UPDATE events SET title = ?, starts_at = ?, location = ?, host_name = ?, ask_comment = ?, ask_adults = ?, ask_kids = ?, ask_infants = ?
     WHERE id = ?`,
    [
      fields.title,
      fields.startsAt,
      fields.location,
      fields.hostName,
      fields.askComment,
      fields.askAdults,
      fields.askKids,
      fields.askInfants,
      event.id,
    ],
  );
  revalidatePath(`/e/${event.id}/manage`);
  redirect(`/e/${event.id}/manage?t=${event.admin_token}&notice=` + encodeURIComponent("Event updated."));
}

export async function addInvitee(formData: FormData) {
  const event = await requireOrganizer(formData);
  const email = required(formData, "email").toLowerCase();
  const displayName = required(formData, "displayName");
  if (!displayName || !isEmail(email)) {
    redirect(
      `/e/${event.id}/manage?t=${event.admin_token}&error=` +
        encodeURIComponent("Need a display name and a valid email."),
    );
  }
  try {
    await run(
      `INSERT INTO invitees (id, event_id, email, display_name, token, invited_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      [newId(), event.id, email, displayName, newToken(), new Date().toISOString()],
    );
  } catch {
    redirect(
      `/e/${event.id}/manage?t=${event.admin_token}&error=` +
        encodeURIComponent("That email is already on this event."),
    );
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(`/e/${event.id}/manage?t=${event.admin_token}&notice=` + encodeURIComponent("Invitee added."));
}

async function sendOne(eventId: string, inviteeId: string) {
  const event = await getEvent(eventId);
  if (!event) throw new Error("Event not found");
  const invitees = await listInvitees(eventId);
  const invitee = invitees.find((row) => row.id === inviteeId);
  if (!invitee) throw new Error("Invitee not found");
  if (!mailConfigured()) {
    throw new Error("Email is not configured. Copy the RSVP link below, or set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }
  await sendInviteEmail({
    event,
    invitee,
    rsvpLink: rsvpUrl(invitee.token),
  });
  await run(`UPDATE invitees SET invited_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    invitee.id,
  ]);
}

export async function sendInvite(formData: FormData) {
  const event = await requireOrganizer(formData);
  const inviteeId = required(formData, "inviteeId");
  try {
    await sendOne(event.id, inviteeId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send invite.";
    redirect(`/e/${event.id}/manage?t=${event.admin_token}&error=` + encodeURIComponent(message));
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(`/e/${event.id}/manage?t=${event.admin_token}&notice=` + encodeURIComponent("Invite sent."));
}

export async function sendAllUnsent(formData: FormData) {
  const event = await requireOrganizer(formData);
  const invitees = await listInvitees(event.id);
  const pending = invitees.filter((row) => !row.invited_at);
  if (pending.length === 0) {
    redirect(`/e/${event.id}/manage?t=${event.admin_token}&notice=` + encodeURIComponent("No unsent invites."));
  }
  try {
    for (const invitee of pending) {
      await sendOne(event.id, invitee.id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send invites.";
    redirect(`/e/${event.id}/manage?t=${event.admin_token}&error=` + encodeURIComponent(message));
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(
    `/e/${event.id}/manage?t=${event.admin_token}&notice=` +
      encodeURIComponent(`Sent ${pending.length} invite${pending.length === 1 ? "" : "s"}.`),
  );
}

export async function saveRsvp(formData: FormData) {
  const token = required(formData, "token");
  const invitee = await getInviteeByToken(token);
  if (!invitee) redirect("/");
  const event = await getEvent(invitee.event_id);
  if (!event) redirect("/");

  const attendingRaw = required(formData, "attending");
  if (attendingRaw !== "yes" && attendingRaw !== "no") {
    redirect(`/rsvp/${token}?error=` + encodeURIComponent("Please choose yes or no."));
  }
  const attending = attendingRaw === "yes" ? 1 : 0;
  const comment = event.ask_comment ? String(formData.get("comment") ?? "").trim() : "";
  const adults = attending && event.ask_adults ? asCount(formData.get("adults")) : 0;
  const kids = attending && event.ask_kids ? asCount(formData.get("kids")) : 0;
  const infants = attending && event.ask_infants ? asCount(formData.get("infants")) : 0;

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
