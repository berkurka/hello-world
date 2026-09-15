import nodemailer from "nodemailer";
import { inviteCardPng } from "./invite-card";
import { formatWhen } from "./format";
import type { EventRow, InviteeRow } from "./types";

export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
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
  const png = await inviteCardPng({
    guestName: invitee.display_name,
    title: event.title,
    when,
    location: event.location,
    hostName: event.host_name,
  });
  const fromName = process.env.FROM_NAME?.trim() || "Invite";
  const fromUser = process.env.GMAIL_USER!;
  await transporter().sendMail({
    from: `"${fromName.replace(/"/g, "")}" <${fromUser}>`,
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
