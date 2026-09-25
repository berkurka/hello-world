import nodemailer, { type Transporter } from "nodemailer";
import { getEventImageDataUrl } from "./db";
import { inviteCardPng } from "./invite-card";
import { formatWhen } from "./format";
import { inviteRecipients, type InviteDelivery } from "./invite-delivery";
import type { EventRow, InviteeRow } from "./types";

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function trimmed(value: string | undefined) {
  return value?.trim() ?? "";
}

function smtpPort(value: string | undefined) {
  const raw = trimmed(value);
  if (!raw) return 465;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 465;
  return port;
}

/** Generic SMTP when the full set is present; otherwise legacy Gmail. */
export function mailConfigFrom(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const host = trimmed(env.SMTP_HOST);
  const user = trimmed(env.SMTP_USER);
  const pass = trimmed(env.SMTP_PASS);
  const from = trimmed(env.MAIL_FROM);
  if (host && user && pass && from) {
    const port = smtpPort(env.SMTP_PORT);
    return { host, port, secure: port === 465, user, pass, from };
  }
  const gmailUser = trimmed(env.GMAIL_USER);
  const gmailPass = trimmed(env.GMAIL_APP_PASSWORD);
  if (gmailUser && gmailPass) {
    return {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: gmailUser,
      pass: gmailPass,
      from: gmailUser,
    };
  }
  return null;
}

export function mailConfigured(env: NodeJS.ProcessEnv = process.env) {
  return mailConfigFrom(env) !== null;
}

export function mailFromHeader(env: NodeJS.ProcessEnv = process.env) {
  const config = mailConfigFrom(env);
  if (!config) return null;
  const name = (env.FROM_NAME?.trim() || "Partyz").replace(/"/g, "");
  return `"${name}" <${config.from}>`;
}

export function providerErrorMessage(err: unknown) {
  let text = "Send failed.";
  if (err && typeof err === "object") {
    const response = (err as { response?: unknown }).response;
    const message = (err as { message?: unknown }).message;
    if (typeof response === "string" && response.trim()) text = response.trim();
    else if (typeof message === "string" && message.trim()) text = message.trim();
  } else if (typeof err === "string" && err.trim()) {
    text = err.trim();
  }
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > 500 ? `${collapsed.slice(0, 499)}…` : collapsed;
}

const NOT_CONFIGURED =
  "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM.";

function requireMailConfig() {
  const config = mailConfigFrom();
  if (!config) throw new Error(NOT_CONFIGURED);
  return config;
}

let cached: { key: string; transport: Transporter } | null = null;

function transporter() {
  const config = requireMailConfig();
  const key = [config.host, String(config.port), config.user, config.pass].join("\0");
  if (cached?.key === key) return cached.transport;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  cached = { key, transport };
  return transport;
}

export async function sendInviteEmail(opts: {
  event: EventRow;
  invitee: InviteeRow;
  rsvpLink: string;
}): Promise<InviteDelivery> {
  const { event, invitee, rsvpLink } = opts;
  const recipients = inviteRecipients(invitee);
  if (recipients.length === 0) {
    throw new Error("Invitee has no email address.");
  }
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
  const from = mailFromHeader();
  if (!from) throw new Error(NOT_CONFIGURED);
  const message = {
    from,
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
  };
  const transport = transporter();
  const sent: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];
  for (const email of recipients) {
    try {
      await transport.sendMail({ ...message, to: email });
      sent.push(email);
    } catch (err) {
      failed.push(email);
      const messageText = providerErrorMessage(err);
      if (!errors.includes(messageText)) errors.push(messageText);
    }
  }
  return errors.length > 0 ? { sent, failed, error: errors.join(" ") } : { sent, failed };
}

export async function sendHostClaimEmail(opts: {
  event: EventRow;
  hostEmail: string;
  claimLink: string;
}) {
  const { event, hostEmail, claimLink } = opts;
  const from = mailFromHeader();
  if (!from) throw new Error(NOT_CONFIGURED);
  await transporter().sendMail({
    from,
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
