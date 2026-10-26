import { GuestInvite } from "@/app/components/guest-invite";
import { OpenInMaps } from "@/app/components/open-in-maps";
import { PartyActions } from "@/app/components/party-actions";
import { icsPath } from "@/lib/app-url";
import { getGuestInvitee, getPublicEvent, getRsvp, listRsvpCounts } from "@/lib/db";
import { toPublicEvent, toPublicInvitee, toPublicRsvp } from "@/lib/public-event";
import {
  capRemaining,
  partyFullMessage,
  partyIsCancelled,
  readGuestCap,
  spotsLeftMessage,
  othersGoing,
} from "@/lib/rsvp-rules";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; open?: string }>;
}) {
  const { token } = await params;
  const { error, open } = await searchParams;
  const invitee = await getGuestInvitee(token);
  if (!invitee) notFound();
  const loaded = await getPublicEvent(invitee.event_id);
  if (!loaded) notFound();
  const event = toPublicEvent(loaded);
  const guest = toPublicInvitee(invitee);
  const rsvp = await getRsvp(invitee.id);
  const place = event.location ?? "";
  const cap = readGuestCap(event.guest_cap);
  const counts = cap == null || partyIsCancelled(event.cancelled_at) ? [] : await listRsvpCounts(event.id);
  const others = othersGoing(event, counts, invitee.id);
  const remaining = capRemaining(cap, others);
  const capMessage =
    remaining == null
      ? null
      : remaining <= 0
        ? partyFullMessage(cap ?? 0, event.allow_maybe === 1)
        : spotsLeftMessage(remaining);
  const animateEnvelope = !error && (open === "1" || !rsvp);

  return (
    <GuestInvite
      event={event}
      guestName={guest.display_name}
      invitee={guest}
      token={invitee.token}
      rsvp={rsvp ? toPublicRsvp(rsvp) : null}
      error={error}
      allowMaybe={event.allow_maybe === 1}
      capMessage={capMessage}
      animateEnvelope={animateEnvelope}
      calendar={
        <PartyActions
          title={event.title}
          startsAt={event.starts_at}
          endsAt={event.ends_at ?? null}
          timezone={event.timezone ?? null}
          location={place}
          details=""
          icsPath={icsPath(invitee.token)}
          showMaps={false}
        />
      }
      maps={(event.location ?? "").trim() ? <OpenInMaps location={place} /> : null}
    />
  );
}
