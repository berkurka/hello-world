"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hostClaimUrl, rsvpUrl } from "@/lib/app-url";
import {
  deleteEventImage,
  getEvent,
  getEventForOrganizer,
  getInviteeByToken,
  getRsvp,
  insertInvitee,
  listInvitees,
  run,
  saveEventImage,
} from "@/lib/db";
import { asBool, asCount, isEmail } from "@/lib/format";
import { newId, newToken } from "@/lib/ids";
import {
  applyExistingEmails,
  INVITEE_CSV_MAX_BYTES,
  parseInviteeCsv,
  summarizeInviteeImport,
} from "@/lib/invitee-csv";
import { inspectPartyImage } from "@/lib/party-image";
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
    return { error: "Title is required." };
  }
  if (!fields.startsAt) {
    return { error: "Date and time are required." };
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
  await run(
    `INSERT INTO events (id, admin_token, title, starts_at, location, host_name, host_email, host_claim_token, host_claimed_at, ask_comment, ask_adults, ask_kids, ask_infants, party_image_mime, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, ?)`,
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
  if (image.kind === "file") {
    await saveEventImage(id, image.mime, image.data);
  }

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
          party_image_mime: image.kind === "file" ? image.mime : null,
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
    return { error: "Title is required." };
  }
  if (!fields.startsAt) {
    return { error: "Date and time are required." };
  }
  if (!fields.hostName) {
    return { error: "Host name is required." };
  }
  const image = await readPartyImageInput(formData);
  if (image.kind === "error") return { error: image.error };
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
  if (image.kind === "file") {
    await saveEventImage(event.id, image.mime, image.data);
  } else if (image.kind === "remove") {
    await deleteEventImage(event.id);
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(`/e/${event.id}/manage?t=${event.admin_token}&notice=` + encodeURIComponent("Event updated."));
}

function managePath(
  event: { id: string; admin_token: string },
  flash: { notice?: string; error?: string },
) {
  const params = new URLSearchParams();
  params.set("t", event.admin_token);
  if (flash.notice) params.set("notice", flash.notice);
  if (flash.error) params.set("error", flash.error);
  return `/e/${event.id}/manage?${params.toString()}`;
}

export async function addInvitee(formData: FormData) {
  const event = await requireOrganizer(formData);
  const email = required(formData, "email").toLowerCase();
  const displayName = required(formData, "displayName");
  if (!displayName || !isEmail(email)) {
    redirect(managePath(event, { error: "Need a display name and a valid email." }));
  }
  try {
    await insertInvitee(event.id, email, displayName);
  } catch {
    redirect(managePath(event, { error: "That email is already on this event." }));
  }
  revalidatePath(`/e/${event.id}/manage`);
  redirect(managePath(event, { notice: "Invitee added." }));
}

export async function importInvitees(formData: FormData) {
  const event = await requireOrganizer(formData);
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect(managePath(event, { error: "Choose a CSV file to import." }));
  }
  if (file.size > INVITEE_CSV_MAX_BYTES) {
    redirect(managePath(event, { error: "That file is too large. Use a CSV under 256 KB." }));
  }
  const text = await file.text();
  const existing = await listInvitees(event.id);
  const plan = applyExistingEmails(
    parseInviteeCsv(text),
    existing.map((row) => row.email),
  );
  let added = 0;
  for (const row of plan.toAdd) {
    try {
      await insertInvitee(event.id, row.email, row.displayName);
      added += 1;
    } catch {
      plan.skips.push({ line: row.line, reason: "already on this event" });
    }
  }
  plan.skips.sort((a, b) => a.line - b.line);
  const summary = summarizeInviteeImport(added, plan.skips);
  revalidatePath(`/e/${event.id}/manage`);
  if (added === 0) {
    redirect(managePath(event, { error: summary }));
  }
  redirect(managePath(event, { notice: summary }));
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
