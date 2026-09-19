import nodemailer from "nodemailer";
import { getEventImageDataUrl } from "./db";
import { inviteCardPng } from "./invite-card";
import { formatWhen } from "./format";
import type { EventRow, InviteeRow } from "./types";

export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function fromName() {
  return process.env.FROM_NAME?.trim() || "Partyz";
}

function transporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendInviteEmail(opts: {
  event: EventRow;
  invitee: InviteeRow;
  rsvpLink: string;
}) {
  const { event, invitee, rsvpLink } = opts;
  const when = formatWhen(event.starts_at);
  const imageSrc = event.party_image_mime ? await getEventImageDataUrl(event.id) : null;
  const png = await inviteCardPng({
    guestName: invitee.display_name,
    title: event.title,
    when,
    location: event.location,
    hostName: event.host_name,
    imageSrc,
  });
  const fromUser = process.env.GMAIL_USER!;
  await transporter().sendMail({
    from: `"${fromName().replace(/"/g, "")}" <${fromUser}>`,
    to: invitee.email,
    subject: `You're invited: ${event.title}`,
    text: [
      `Hi ${invitee.display_name},`,
      "",
      `${event.host_name} invited you to ${event.title}.`,
      when,
      event.location || "",
      "",
      `RSVP here: ${rsvpLink}`,
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>Hi ${escapeHtml(invitee.display_name)},</p>
        <p>${escapeHtml(event.host_name)} invited you to <strong>${escapeHtml(event.title)}</strong>.</p>
        <p>
          <img src="cid:invitation" alt="Invitation for ${escapeHtml(invitee.display_name)}" style="width:100%;max-width:640px;border:1px solid #e6d9c8" />
        </p>
        <p><a href="${rsvpLink}" style="display:inline-block;background:#8b2942;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">RSVP now</a></p>
        <p style="color:#5c4638">Or paste this link: ${escapeHtml(rsvpLink)}</p>
      </div>
    `,
    attachments: [
      {
        filename: "invitation.png",
        content: png,
        cid: "invitation",
      },
    ],
  });
}

export async function sendHostClaimEmail(opts: {
  event: EventRow;
  hostEmail: string;
  claimLink: string;
}) {
  const { event, hostEmail, claimLink } = opts;
  const fromUser = process.env.GMAIL_USER!;
  await transporter().sendMail({
    from: `"${fromName().replace(/"/g, "")}" <${fromUser}>`,
    to: hostEmail,
    subject: `Open your Partyz dashboard: ${event.title}`,
    text: [
      `Hi ${event.host_name},`,
      "",
      `Your party “${event.title}” is ready.`,
      "Open the dashboard with this link (no password):",
      claimLink,
      "",
      "This link works until you open it, or for 7 days — whichever comes first. After that, use the dashboard URL you saved when you created the party.",
    ].join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>Hi ${escapeHtml(event.host_name)},</p>
        <p>Your party <strong>${escapeHtml(event.title)}</strong> is ready.</p>
        <p><a href="${claimLink}" style="display:inline-block;background:#8b2942;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Open dashboard</a></p>
        <p style="color:#5c4638">Or paste this link: ${escapeHtml(claimLink)}</p>
        <p style="color:#5c4638">This link works until you open it, or for 7 days. After that, use the dashboard URL you saved when you created the party.</p>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
