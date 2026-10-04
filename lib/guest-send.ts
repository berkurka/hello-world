import { optOutUrl, rsvpUrl } from "./app-url";
import { assertDailyBudget } from "./email-log";
import { EmailQuotaError } from "./email-budget";
import { formatInviteWhen } from "./format";
import {
  guestEmailNotice,
  hostReplyTo,
  reachableGuests,
  remindedRecently,
  type GuestAudience,
  type PartyChange,
} from "./guest-list";
import { changeNoticeContent, guestMessageContent, reminderContent } from "./guest-mail";
import { markReminded, restoreReminded } from "./guests";
import { inviteRecipients } from "./invite-delivery";
import { mailConfigured, mailFromHeader, sendPlainGuestEmail } from "./mail";
import type { EventRow, InviteeWithRsvp } from "./types";

type Note = { subject: string; text: string; html: string };

export async function emailGuestGroup(opts: {
  event: EventRow;
  invitees: InviteeWithRsvp[];
  audience: GuestAudience;
  kind: "reminder" | "change" | "message";
  verb: string;
  build: (invitee: InviteeWithRsvp) => Note;
}) {
  if (!mailConfigured() || !mailFromHeader()) {
    return { notice: "Email sending is off, so guests were not notified.", sentGuests: 0 };
  }
  const reachable = reachableGuests(opts.invitees, opts.audience);
  const targets =
    opts.kind === "reminder" ? reachable.filter((row) => !remindedRecently(row.last_reminded_at)) : reachable;
  if (opts.kind === "reminder" && targets.length === 0 && reachable.length > 0) {
    return { notice: "Those guests were reminded in the last 24 hours.", sentGuests: 0 };
  }
  const addresses = targets.reduce((sum, row) => sum + inviteRecipients(row).length, 0);
  if (addresses === 0) {
    return { notice: guestEmailNotice({ verb: opts.verb, sentGuests: 0, failed: [] }), sentGuests: 0 };
  }
  try {
    await assertDailyBudget(addresses);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send email.";
    return { notice: message, sentGuests: 0 };
  }

  const replyTo = hostReplyTo(opts.event.host_email);
  let sentGuests = 0;
  const failed: string[] = [];
  let stopped: string | undefined;
  for (const invitee of targets) {
    const note = opts.build(invitee);
    const claimedReminder = opts.kind === "reminder" ? await markReminded(invitee.id) : false;
    if (opts.kind === "reminder" && !claimedReminder) continue;
    let any = false;
    for (const email of inviteRecipients(invitee)) {
      try {
        await sendPlainGuestEmail({
          to: email,
          subject: note.subject,
          text: note.text,
          html: note.html,
          replyTo,
          kind: opts.kind,
        });
        any = true;
      } catch (err) {
        failed.push(email);
        if (err instanceof EmailQuotaError) {
          stopped = err.message;
          break;
        }
      }
    }
    if (any) sentGuests += 1;
    else if (claimedReminder) await restoreReminded(invitee.id, invitee.last_reminded_at);
    if (stopped) break;
  }
  return {
    sentGuests,
    notice: guestEmailNotice({
      verb: opts.verb,
      sentGuests,
      failed,
      error: stopped,
    }),
  };
}

export function reminderNote(event: EventRow, invitee: InviteeWithRsvp) {
  return reminderContent({
    guestName: invitee.display_name,
    hostName: event.host_name,
    title: event.title,
    when: formatInviteWhen(event.starts_at, event.ends_at),
    location: event.location,
    rsvpLink: rsvpUrl(invitee.token),
    optOutLink: optOutUrl(invitee.token),
  });
}

export function changeNote(event: EventRow, invitee: InviteeWithRsvp, changes: PartyChange[]) {
  return changeNoticeContent({
    guestName: invitee.display_name,
    hostName: event.host_name,
    title: event.title,
    rsvpLink: rsvpUrl(invitee.token),
    changes,
    optOutLink: optOutUrl(invitee.token),
  });
}

export function messageNote(event: EventRow, invitee: InviteeWithRsvp, message: string) {
  return guestMessageContent({
    guestName: invitee.display_name,
    hostName: event.host_name,
    title: event.title,
    when: formatInviteWhen(event.starts_at, event.ends_at),
    location: event.location,
    message,
    rsvpLink: rsvpUrl(invitee.token),
    optOutLink: optOutUrl(invitee.token),
  });
}
