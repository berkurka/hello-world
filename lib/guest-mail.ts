import type { PartyChange } from "./guest-list";
import { mailSubject } from "./guest-list";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlShell(inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#241910;max-width:640px">${inner}</div>`;
}

function rsvpButton(link: string) {
  return `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#8b2942;color:#fff;padding:14px 22px;text-decoration:none;border-radius:10px;font-weight:700">RSVP</a></p>
        <p style="color:#6a5648">Or paste this link: ${escapeHtml(link)}</p>`;
}

function optOutFooter(link?: string) {
  if (!link) return { text: "", html: "" };
  return {
    text: `\n\nIf you don't want these emails, opt out: ${link}`,
    html: `<p style="color:#6a5648">If you don't want these emails, <a href="${escapeHtml(link)}">opt out</a>.</p>`,
  };
}

export function reminderContent(opts: {
  guestName: string;
  hostName: string;
  title: string;
  when: string;
  location: string;
  rsvpLink: string;
  optOutLink?: string;
}) {
  const place = opts.location ? `\n${opts.location}` : "";
  const optOut = optOutFooter(opts.optOutLink);
  const text = [
    `Hi ${opts.guestName},`,
    "",
    `${opts.hostName} is still hoping to hear if you can make it to ${opts.title}.`,
    opts.when + place,
    "",
    `RSVP here: ${opts.rsvpLink}`,
    optOut.text,
  ].join("\n");
  const html = htmlShell(`
        <p>Hi ${escapeHtml(opts.guestName)},</p>
        <p>${escapeHtml(opts.hostName)} is still hoping to hear if you can make it to <strong>${escapeHtml(opts.title)}</strong>.</p>
        <p>${escapeHtml(opts.when)}${opts.location ? `<br>${escapeHtml(opts.location)}` : ""}</p>
        ${rsvpButton(opts.rsvpLink)}
        ${optOut.html}
      `);
  return {
    subject: mailSubject(`Are you coming? ${opts.title}`),
    text,
    html,
  };
}

export function changeNoticeContent(opts: {
  guestName: string;
  hostName: string;
  title: string;
  rsvpLink: string;
  changes: PartyChange[];
  optOutLink?: string;
}) {
  const optOut = optOutFooter(opts.optOutLink);
  const lines = opts.changes.map((change) => `${change.label}: ${change.from} → ${change.to}`);
  const text = [
    `Hi ${opts.guestName},`,
    "",
    `${opts.hostName} updated ${opts.title}.`,
    "",
    "What changed:",
    ...lines,
    "",
    `RSVP here: ${opts.rsvpLink}`,
    optOut.text,
  ].join("\n");
  const htmlLines = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const html = htmlShell(`
        <p>Hi ${escapeHtml(opts.guestName)},</p>
        <p>${escapeHtml(opts.hostName)} updated <strong>${escapeHtml(opts.title)}</strong>.</p>
        <p><strong>What changed</strong></p>
        <ul>${htmlLines}</ul>
        ${rsvpButton(opts.rsvpLink)}
        ${optOut.html}
      `);
  return {
    subject: mailSubject(`Updated: ${opts.title}`),
    text,
    html,
  };
}

export function guestMessageContent(opts: {
  guestName: string;
  hostName: string;
  title: string;
  when: string;
  location: string;
  message: string;
  rsvpLink: string;
  optOutLink?: string;
}) {
  const place = opts.location ? `\n${opts.location}` : "";
  const optOut = optOutFooter(opts.optOutLink);
  const text = [
    `Hi ${opts.guestName},`,
    "",
    opts.message.trim(),
    "",
    `— ${opts.hostName}`,
    "",
    opts.title,
    opts.when + place,
    `RSVP: ${opts.rsvpLink}`,
    optOut.text,
  ].join("\n");
  const messageHtml = escapeHtml(opts.message.trim()).replace(/\n/g, "<br>");
  const html = htmlShell(`
        <p>Hi ${escapeHtml(opts.guestName)},</p>
        <p>${messageHtml}</p>
        <p>— ${escapeHtml(opts.hostName)}</p>
        <p style="color:#6a5648">${escapeHtml(opts.title)}<br>${escapeHtml(opts.when)}${
          opts.location ? `<br>${escapeHtml(opts.location)}` : ""
        }</p>
        ${rsvpButton(opts.rsvpLink)}
        ${optOut.html}
      `);
  return {
    subject: mailSubject(`${opts.hostName} sent a message about ${opts.title}`),
    text,
    html,
  };
}
