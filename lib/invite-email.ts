import type { InviteTheme } from "./themes";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteEmailHtml(opts: {
  guestName: string;
  hostName: string;
  title: string;
  when: string;
  place: string;
  rsvpLink: string;
  theme: InviteTheme;
  /** Optional HTML from the calendar work, inserted above the RSVP button. */
  calendarHtml?: string;
}) {
  const theme = opts.theme;
  const preheader = [opts.when, opts.place].filter(Boolean).join(" · ");
  const buttonText = theme.accentInk;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${theme.dark ? theme.frame : "#f6f1ea"};">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.dark ? theme.frame : "#f6f1ea"};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${theme.paper};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:0;">
                <img src="cid:invitation" alt="${escapeHtml(`Invitation to ${opts.title}`)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;font-family:Georgia,'Times New Roman',serif;color:${theme.ink};">
                <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;">Hi ${escapeHtml(opts.guestName)},</p>
                <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;">${escapeHtml(opts.hostName)} invited you to <strong>${escapeHtml(opts.title)}</strong>.</p>
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${theme.muted};">${escapeHtml(opts.when)}</p>
                ${opts.place ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${theme.muted};">${escapeHtml(opts.place)}</p>` : ""}
              </td>
            </tr>
            ${opts.calendarHtml ? `<tr><td style="padding:8px 28px 0;font-family:Arial,Helvetica,sans-serif;">${opts.calendarHtml}</td></tr>` : ""}
            <tr>
              <td style="padding:20px 28px 32px;">
                <a href="${escapeHtml(opts.rsvpLink)}" style="display:inline-block;background:${theme.accent};color:${buttonText};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1;padding:14px 22px;text-decoration:none;border-radius:10px;">RSVP now</a>
                <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${theme.muted};">Or paste this link: ${escapeHtml(opts.rsvpLink)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
