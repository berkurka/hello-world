import { GuestFooter } from "@/app/components/guest-footer";
import { InviteCardView, themeVars } from "@/app/components/invite-card-view";
import { PartyFacts } from "@/app/components/party-facts";
import { RsvpResponse } from "@/app/components/rsvp-response";
import { formatInviteWhen, formatWhen, partyHasPassed } from "@/lib/format";
import { partyImagePath } from "@/lib/party-image";
import { themeById } from "@/lib/themes";
import type { EventRow, InviteeRow, RsvpRow } from "@/lib/types";
import type { ReactNode } from "react";

export function GuestInvite({
  event,
  guestName,
  invitee,
  rsvp,
  error,
  preview = false,
  calendar,
  maps,
  allowMaybe = false,
}: {
  event: EventRow;
  guestName: string;
  invitee?: InviteeRow | null;
  rsvp: RsvpRow | null;
  error?: string;
  preview?: boolean;
  calendar?: ReactNode;
  maps?: ReactNode;
  allowMaybe?: boolean;
}) {
  const theme = themeById(event.theme);
  const imageSrc = event.party_image_mime ? partyImagePath(event.id) : null;
  const when = formatInviteWhen(event.starts_at, event.ends_at);
  const passed = partyHasPassed(event.starts_at);
  return (
    <div className="guest-shell" style={themeVars(theme)} data-theme={theme.id}>
      {preview ? <p className="preview-banner">Preview — guests answer on their own link.</p> : null}
      <main className="guest-wrap">
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
        <PartyFacts
          when={formatWhen(event.starts_at)}
          place={event.location}
          hostName={event.host_name}
          notes={event.notes}
          calendar={calendar}
          maps={maps}
        />
        {preview || !invitee ? (
          <div className="card stack">
            <p className="lede">Guests choose Going or Can&apos;t go here.</p>
          </div>
        ) : (
          <RsvpResponse
            token={invitee.token}
            event={event}
            invitee={invitee}
            rsvp={rsvp}
            openForm={Boolean(error)}
            passed={passed}
            allowMaybe={allowMaybe}
          />
        )}
      </main>
      <GuestFooter />
    </div>
  );
}
