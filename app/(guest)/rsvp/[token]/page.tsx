import { GuestInvite } from "@/app/components/guest-invite";
import { OpenInMaps } from "@/app/components/open-in-maps";
import { PartyActions } from "@/app/components/party-actions";
import { icsPath } from "@/lib/app-url";
import { getGuestInvitee, getPublicEvent, getRsvp } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invitee = await getGuestInvitee(token);
  if (!invitee) notFound();
  const event = await getPublicEvent(invitee.event_id);
  if (!event) notFound();
  const rsvp = await getRsvp(invitee.id);
  const place = event.location ?? "";

  return (
    <GuestInvite
      event={event}
      guestName={invitee.display_name}
      invitee={invitee}
      rsvp={rsvp}
      error={error}
      allowMaybe={(event.allow_maybe ?? 0) !== 0}
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
      maps={place.trim() ? <OpenInMaps location={place} /> : null}
    />
  );
}
