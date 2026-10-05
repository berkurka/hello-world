import { clearHostRsvp, removeInvitee, replaceInviteeLink, updateInvitee } from "@/app/actions";
import { CopyButton } from "@/app/components/copy-button";
import { HostReplyForm } from "@/app/components/host-reply-form";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { rsvpUrl } from "@/lib/app-url";
import { normalizeStoredEmail } from "@/lib/format";
import type { InviteeWithRsvp } from "@/lib/types";

export function GuestMenu({
  eventId,
  token,
  invitee,
  askComment,
  askAdults,
  askKids,
  askInfants,
  allowMaybe = false,
}: {
  eventId: string;
  token: string;
  invitee: InviteeWithRsvp;
  askComment: boolean;
  askAdults: boolean;
  askKids: boolean;
  askInfants: boolean;
  allowMaybe?: boolean;
}) {
  const email = normalizeStoredEmail(invitee.email) ?? "";
  const emailRequired = invitee.joined_via !== "link";
  const link = rsvpUrl(invitee.token);

  return (
    <details className="guest-menu">
      <summary className="btn ghost">Manage</summary>
      <div className="guest-menu-panel">
        <form action={updateInvitee} className="stack">
          <h3>Edit guest</h3>
          <input type="hidden" name="eventId" value={eventId} />
          {token ? <input type="hidden" name="t" value={token} /> : null}
          <input type="hidden" name="inviteeId" value={invitee.id} />
          <label className="field">
            <span>Name</span>
            <input className="control" type="text" name="displayName" required defaultValue={invitee.display_name} />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="control" type="email" name="email" required={emailRequired} defaultValue={email} />
          </label>
          <label className="field">
            <span>Second email</span>
            <input
              className="control"
              type="email"
              name="email2"
              defaultValue={normalizeStoredEmail(invitee.email2) ?? ""}
            />
          </label>
          <SubmitButton label="Save guest" pendingLabel="Saving…" />
        </form>

        <HostReplyForm
          eventId={eventId}
          token={token}
          inviteeId={invitee.id}
          attending={invitee.attending}
          comment={invitee.comment ?? ""}
          adults={invitee.adults ?? (askAdults ? 1 : 0)}
          kids={invitee.kids ?? 0}
          infants={invitee.infants ?? 0}
          askComment={askComment}
          askAdults={askAdults}
          askKids={askKids}
          askInfants={askInfants}
          allowMaybe={allowMaybe}
        />
        {invitee.attending !== null ? (
          <form action={clearHostRsvp}>
            <input type="hidden" name="eventId" value={eventId} />
            {token ? <input type="hidden" name="t" value={token} /> : null}
            <input type="hidden" name="inviteeId" value={invitee.id} />
            <SubmitButton variant="ghost" label="Clear reply" pendingLabel="Clearing…" />
          </form>
        ) : null}

        <div className="stack">
          <h3>Link</h3>
          <CopyButton text={link} label="Copy link" className="btn" />
          <form action={replaceInviteeLink} className="stack">
            <input type="hidden" name="eventId" value={eventId} />
            {token ? <input type="hidden" name="t" value={token} /> : null}
            <input type="hidden" name="inviteeId" value={invitee.id} />
            <label className="switch">
              <input type="checkbox" name="confirmReplace" required />
              <span className="switch-track" aria-hidden="true" />
              <span className="switch-copy">Replace a forwarded link. The old one stops working.</span>
            </label>
            <SubmitButton variant="ghost" label="New link" pendingLabel="Replacing…" />
          </form>
        </div>

        <form action={removeInvitee} className="stack">
          <h3>Remove</h3>
          <input type="hidden" name="eventId" value={eventId} />
          {token ? <input type="hidden" name="t" value={token} /> : null}
          <input type="hidden" name="inviteeId" value={invitee.id} />
          <label className="switch">
            <input type="checkbox" name="confirmRemove" required />
            <span className="switch-track" aria-hidden="true" />
            <span className="switch-copy">Remove this guest and their reply</span>
          </label>
          <SubmitButton variant="ghost" label="Remove guest" pendingLabel="Removing…" />
        </form>
      </div>
    </details>
  );
}
