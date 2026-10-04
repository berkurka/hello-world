import nodemailer, { type Transporter } from "nodemailer";
import { icsUrl } from "./app-url";
import { googleCalendarUrl, outlookCalendarUrl } from "./calendar";
import { getEventImageDataUrl } from "./db";
import { formatInviteWhen, formatWhen } from "./format";
import { inviteCardPng } from "./invite-card";
import { inviteEmailHtml } from "./invite-email";
import { inviteRecipients, type InviteDelivery } from "./invite-delivery";
import { googleMapsUrl } from "./maps";
import { partyShareDescription, partyShareTitle } from "./party-share";
import { themeById } from "./themes";
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

type MailEnv = Record<string, string | undefined>;

/** Generic SMTP when the full set is present; otherwise legacy Gmail. */
export function mailConfigFrom(env: MailEnv = process.env): MailConfig | null {
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

export function mailConfigured(env: MailEnv = process.env) {
  return mailConfigFrom(env) !== null;
}

export function mailFromHeader(env: MailEnv = process.env) {
  const config = mailConfigFrom(env);
  if (!config) return null;
  const name = (env.FROM_NAME?.trim() || "Partyz").replace(/"/g, "");
  return `"${name}" <${config.from}>`;
}

export function hostDisplayName(hostName: string) {
  const host = hostName.replace(/[\r\n"\\<>@]/g, " ").replace(/\s+/g, " ").trim();
  const suffix = " via Partyz";
  if (!host) return "Partyz";
  const room = 60 - suffix.length;
  const trimmed = host.length > room ? host.slice(0, room).trim() : host;
  const name = `${trimmed}${suffix}`;
  return name.length > 60 ? name.slice(0, 60).trim() : name;
}

export function hostFromHeader(hostName: string, env: MailEnv = process.env) {
  const config = mailConfigFrom(env);
  if (!config) return null;
  return `"${hostDisplayName(hostName)}" <${config.from}>`;
}

export function inviteReplyTo(event: { host_email?: string | null; host_email_verified_at?: string | null }) {
  if (!event.host_email_verified_at) return undefined;
  const hostEmail = event.host_email?.trim() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostEmail) ? hostEmail : undefined;
}

export const GENERIC_MAIL_ERROR = "Could not send email. Try again in a little while.";

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

const NOT_CONFIGURED_LOG =
  "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM.";
const NOT_CONFIGURED = "Email sending isn't available right now.";

function requireMailConfig() {
  const config = mailConfigFrom();
  if (!config) {
    console.error(NOT_CONFIGURED_LOG);
    throw new Error(NOT_CONFIGURED);
  }
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

export function buildInviteMail(opts: { event: EventRow; invitee: InviteeRow; rsvpLink: string }) {
  const { event, invitee, rsvpLink } = opts;
  const when = formatWhen(event.starts_at);
  const preview = partyShareDescription(event);
  const subject = partyShareTitle(event);
  const calendar = {
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    location: event.location,
    details: "",
  };
  const google = googleCalendarUrl(calendar);
  const outlook = outlookCalendarUrl(calendar);
  const ics = icsUrl(invitee.token);
  const map = event.location.trim() ? googleMapsUrl(event.location.trim()) : null;
  const replyTo = inviteReplyTo(event);
  const textLines = [
    preview,
    "",
    `Hi ${invitee.display_name},`,
    "",
    `${event.host_name} invited you to ${event.title}.`,
    when,
    event.location || "",
    "",
    `RSVP here: ${rsvpLink}`,
    `Add to calendar: ${ics}`,
  ];
  if (google) textLines.push(`Google Calendar: ${google}`);
  if (outlook) textLines.push(`Outlook: ${outlook}`);
  if (map) textLines.push(`Map: ${map}`);
  const text = textLines.join("\n");
  const links = [
    `<a href="${escapeHtml(ics)}">Add to calendar</a>`,
    google ? `<a href="${escapeHtml(google)}">Google Calendar</a>` : "",
    outlook ? `<a href="${escapeHtml(outlook)}">Outlook</a>` : "",
    map ? `<a href="${escapeHtml(map)}">Open in Maps</a>` : "",
  ].filter(Boolean);
  const html = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>Hi ${escapeHtml(invitee.display_name)},</p>
        <p>${escapeHtml(event.host_name)} invited you to <strong>${escapeHtml(event.title)}</strong>.</p>
        <p>
          <img src="cid:invitation" alt="Invitation for ${escapeHtml(invitee.display_name)}" style="width:100%;max-width:640px;border:1px solid #e6d9c8" />
        </p>
        <p><a href="${rsvpLink}" style="display:inline-block;background:#8b2942;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">RSVP now</a></p>
        <p style="color:#5c4638">${links.join(" · ")}</p>
        <p style="color:#5c4638">Or paste this link: ${escapeHtml(rsvpLink)}</p>
      </div>
    `;
  return { subject, text, html, replyTo, preview };
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
  const when = formatInviteWhen(event.starts_at, event.ends_at);
  const theme = themeById(event.theme);
  const imageSrc = event.party_image_mime ? await getEventImageDataUrl(event.id) : null;
  const png = await inviteCardPng({
    guestName: invitee.display_name,
    title: event.title,
    when,
    location: event.location,
    hostName: event.host_name,
    imageSrc,
    theme: theme.id,
  });
  const from = hostFromHeader(event.host_name);
  if (!from) throw new Error(NOT_CONFIGURED);
  const content = buildInviteMail({ event, invitee, rsvpLink });
  const message = {
    from,
    replyTo: content.replyTo,
    subject: content.subject,
    text: content.text,
    html: inviteEmailHtml({
      guestName: invitee.display_name,
      hostName: event.host_name,
      title: event.title,
      when,
      place: event.location,
      rsvpLink,
      theme,
    }),
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
      <div style="font-family:Arial,Helvetica,sans-serif;color:#241910;max-width:640px">
        <p>Hi ${escapeHtml(event.host_name)},</p>
        <p>Your party <strong>${escapeHtml(event.title)}</strong> is ready.</p>
        <p><a href="${claimLink}" style="display:inline-block;background:#8b2942;color:#fff;padding:14px 22px;text-decoration:none;border-radius:10px;font-weight:700">Open dashboard</a></p>
        <p style="color:#6a5648">Or paste this link: ${escapeHtml(claimLink)}</p>
        <p style="color:#6a5648">This link works until you open it, or for 7 days. After that, use the dashboard link you saved when you created the party.</p>
      </div>
    `,
  });
}

export async function sendHostSignInEmail(opts: {
  to: string;
  link: string;
  hostName?: string | null;
  titles?: string[];
  kind: "create" | "recover";
}) {
  const from = mailFromHeader();
  if (!from) throw new Error(NOT_CONFIGURED);
  const titles = (opts.titles ?? []).map((title) => title.trim()).filter(Boolean);
  const party = titles.length === 1 ? titles[0] : null;
  const greeting = opts.hostName?.trim() ? `Hi ${opts.hostName.trim()},` : "Hi,";
  const subject =
    opts.kind === "create" && party ? `Sign in to manage ${party}` : "Sign in to Partyz";
  const intro =
    opts.kind === "create" && party
      ? `${party} is ready. This sign-in link expires in 30 minutes and works once.`
      : "This sign-in link expires in 30 minutes and works once. It opens every party for this email.";
  const list =
    opts.kind === "recover" && titles.length > 0 ? `Parties: ${titles.slice(0, 5).join(", ")}` : "";
  await transporter().sendMail({
    from,
    to: opts.to,
    subject,
    text: [greeting, "", intro, opts.link, list, "", "If you did not ask for this, you can ignore it."].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>${escapeHtml(greeting)}</p>
        <p>${escapeHtml(intro)}</p>
        <p><a href="${opts.link}" style="display:inline-block;background:#8b2942;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Sign in</a></p>
        <p style="color:#5c4638">Or paste this link: ${escapeHtml(opts.link)}</p>
        ${list ? `<p style="color:#5c4638">${escapeHtml(list)}</p>` : ""}
        <p style="color:#5c4638">If you did not ask for this, you can ignore it.</p>
      </div>
    `,
  });
}

export async function sendHostEmailChangeNotice(opts: { to: string; title: string; nextEmail: string }) {
  const from = mailFromHeader();
  if (!from) throw new Error(NOT_CONFIGURED);
  const subject = `Host email change requested for ${opts.title}`;
  const text = [
    `Someone asked to change the host email for “${opts.title}” to ${opts.nextEmail}.`,
    "The address changes only if that inbox confirms the link we sent there.",
    "If this was not you, sign in and reset the dashboard link.",
  ].join("\n");
  await transporter().sendMail({
    from,
    to: opts.to,
    subject,
    text,
    html: `
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>Someone asked to change the host email for <strong>${escapeHtml(opts.title)}</strong> to <strong>${escapeHtml(opts.nextEmail)}</strong>.</p>
        <p>The address changes only if that inbox confirms the link we sent there.</p>
        <p>If this was not you, sign in and reset the dashboard link.</p>
      </div>
    `,
  });
}

export async function sendHostEmailChangeEmail(opts: {
  to: string;
  link: string;
  title: string;
  hostName: string;
}) {
  const from = mailFromHeader();
  if (!from) throw new Error(NOT_CONFIGURED);
  const subject = `Confirm your email for ${opts.title}`;
  await transporter().sendMail({
    from,
    to: opts.to,
    subject,
    text: [
      opts.hostName.trim() ? `Hi ${opts.hostName.trim()},` : "Hi,",
      "",
      `Confirm ${opts.to} as the host email for “${opts.title}”.`,
      "This link expires in 30 minutes and works once:",
      opts.link,
    ].join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">
        <p>${opts.hostName.trim() ? `Hi ${escapeHtml(opts.hostName.trim())},` : "Hi,"}</p>
        <p>Confirm <strong>${escapeHtml(opts.to)}</strong> as the host email for <strong>${escapeHtml(opts.title)}</strong>.</p>
        <p>This link expires in 30 minutes and works once.</p>
        <p><a href="${opts.link}" style="display:inline-block;background:#8b2942;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Confirm email</a></p>
        <p style="color:#5c4638">Or paste this link: ${escapeHtml(opts.link)}</p>
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
