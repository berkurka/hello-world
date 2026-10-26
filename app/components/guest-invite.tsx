import { EnvelopeReveal } from "@/app/components/envelope-reveal";
import { GuestFooter } from "@/app/components/guest-footer";
import { InviteCardView, themeVars } from "@/app/components/invite-card-view";
import { PartyFacts } from "@/app/components/party-facts";
import { RsvpResponse } from "@/app/components/rsvp-response";
import { formatInviteWhen, formatWhen, partyHasPassed } from "@/lib/format";
import {
  cancelledMessage,
  deadlineClosedMessage,
  deadlineHasPassed,
  deadlineOpenMessage,
  partyIsCancelled,
  readDeadline,
} from "@/lib/rsvp-rules";
import { partyImagePath } from "@/lib/party-image";
import { eventVersion } from "@/lib/party-share";
import {
  toPublicEvent,
  toPublicInvitee,
  toPublicRsvp,
  type PublicEvent,
  type PublicInvitee,
  type PublicRsvp,
} from "@/lib/public-event";
import { themeById } from "@/lib/themes";
import type { ReactNode } from "react";

export function GuestInvite({
  event: source,
  guestName,
  invitee: inviteeSource,
  token,
  rsvp: rsvpSource,
  error,
  preview = false,
  calendar,
  maps,
  allowMaybe = false,
  capMessage = null,
  animateEnvelope = false,
}: {
  event: PublicEvent;
  guestName: string;
  invitee?: PublicInvitee | null;
  token?: string | null;
  rsvp: (PublicRsvp & { invitee_id?: string }) | null;
  error?: string;
  preview?: boolean;
  calendar?: ReactNode;
  maps?: ReactNode;
  allowMaybe?: boolean;
  capMessage?: string | null;
  animateEnvelope?: boolean;
}) {
  const event = toPublicEvent(source);
  const invitee = inviteeSource ? toPublicInvitee(inviteeSource) : null;
  const rsvp = rsvpSource ? toPublicRsvp(rsvpSource) : null;
  const theme = themeById(event.theme);
  const imageSrc = event.party_image_mime ? partyImagePath(event.id, eventVersion(event)) : null;
  const when = formatInviteWhen(event.starts_at, event.ends_at);
  const passed = partyHasPassed(event.starts_at);
  const cancelled = partyIsCancelled(event.cancelled_at);
  const deadline = readDeadline(event.rsvp_deadline);
  const deadlineClosed = Boolean(deadline && deadlineHasPassed(deadline));
  const deadlineMessage =
    cancelled || !deadline ? null : deadlineClosed ? deadlineClosedMessage(deadline) : deadlineOpenMessage(deadline);
  const card = (
    <InviteCardView
      hero
      compact
      theme={theme}
      title={event.title}
      guestName={guestName}
      when={when}
      place={event.location}
      hostName={event.host_name}
      imageSrc={imageSrc}
    />
  );
  const body = (
    <>
      <PartyFacts
        when={formatWhen(event.starts_at)}
        place={event.location}
        hostName={event.host_name}
        notes={event.notes}
        calendar={calendar}
        maps={maps}
      />
      {cancelled ? (
        <div className="card stack">
          <h2>This party is cancelled</h2>
          <p className="lede">{cancelledMessage(event.host_name)}</p>
        </div>
      ) : preview || !invitee || !token ? (
        <div className="card stack">
          {deadlineMessage ? <p className="lede">{deadlineMessage}</p> : null}
          {capMessage ? <p className="lede">{capMessage}</p> : null}
          <p className="lede">Guests choose Going or Can&apos;t go here.</p>
        </div>
      ) : (
        <RsvpResponse
          token={token}
          event={event}
          invitee={invitee}
          rsvp={rsvp}
          openForm={Boolean(error)}
          serverError={error}
          passed={passed}
          allowMaybe={allowMaybe}
          deadlineClosed={deadlineClosed}
          deadlineMessage={deadlineMessage}
          capMessage={capMessage}
        />
      )}
    </>
  );
  return (
    <div className="guest-shell" style={themeVars(theme)} data-theme={theme.id}>
      {preview ? <p className="preview-banner">Preview — guests answer on their own link.</p> : null}
      <main className="guest-wrap">
        {animateEnvelope ? (
          <EnvelopeReveal guestName={guestName} play card={card}>
            {body}
          </EnvelopeReveal>
        ) : (
          <>
            {card}
            {body}
          </>
        )}
      </main>
      <GuestFooter />
    </div>
  );
}
