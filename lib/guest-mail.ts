function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type GuestNote = {
  subject: string;
  text: string;
  html: string;
};

function noteBlock(note: string) {
  const text = note.replace(/\r\n/g, "\n").trim().slice(0, 2000);
  return text;
}

function htmlDoc(inner: string) {
  return `<div style="font-family:Georgia,serif;color:#2c1810;max-width:640px">${inner}</div>`;
}

export function reminderMail(opts: {
  guestName: string;
  hostName: string;
  title: string;
  when: string;
  place: string;
  rsvpLink: string;
  note: string;
}): GuestNote {
  const note = noteBlock(opts.note);
  const subject = `Are you coming to ${opts.title}?`;
  const lines = [
    `Hi ${opts.guestName},`,
    "",
    `${opts.hostName} asked if you can make it to ${opts.title}.`,
    opts.when,
    opts.place,
  ];
  if (note) lines.push("", note);
  lines.push("", `RSVP here: ${opts.rsvpLink}`);
  const text = lines.filter((line) => line !== undefined).join("\n");
  const html = htmlDoc(
    [
      `<p>Hi ${escapeHtml(opts.guestName)},</p>`,
      `<p>${escapeHtml(opts.hostName)} asked if you can make it to <strong>${escapeHtml(opts.title)}</strong>.</p>`,
      `<p>${escapeHtml(opts.when)}</p>`,
      opts.place ? `<p>${escapeHtml(opts.place)}</p>` : "",
      note ? `<p>${escapeHtml(note)}</p>` : "",
      `<p><a href="${escapeHtml(opts.rsvpLink)}">RSVP now</a></p>`,
      `<p>Or paste this link: ${escapeHtml(opts.rsvpLink)}</p>`,
    ].join(""),
  );
  return { subject, text, html };
}

export function cancellationMail(opts: {
  guestName: string;
  hostName: string;
  title: string;
  rsvpLink: string;
  note: string;
}): GuestNote {
  const note = noteBlock(opts.note);
  const subject = `${opts.title} is cancelled`;
  const lines = [
    `Hi ${opts.guestName},`,
    "",
    `${opts.hostName} cancelled ${opts.title}.`,
    "You don't need to reply.",
  ];
  if (note) lines.push("", note);
  lines.push("", `Details: ${opts.rsvpLink}`);
  const html = htmlDoc(
    [
      `<p>Hi ${escapeHtml(opts.guestName)},</p>`,
      `<p>${escapeHtml(opts.hostName)} cancelled <strong>${escapeHtml(opts.title)}</strong>.</p>`,
      `<p>You don't need to reply.</p>`,
      note ? `<p>${escapeHtml(note)}</p>` : "",
      `<p>Details: <a href="${escapeHtml(opts.rsvpLink)}">${escapeHtml(opts.rsvpLink)}</a></p>`,
    ].join(""),
  );
  return { subject, text: lines.join("\n"), html };
}
