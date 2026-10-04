import { GuestInvite } from "@/app/components/guest-invite";
import { OpenInMaps } from "@/app/components/open-in-maps";
import { PartyActions } from "@/app/components/party-actions";
import { icsPath } from "@/lib/app-url";
import { getEvent, getInviteeByToken, getRsvp } from "@/lib/db";
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
  const invitee = await getInviteeByToken(token);
  if (!invitee) notFound();
  const event = await getEvent(invitee.event_id);
  if (!event) notFound();
  const rsvp = await getRsvp(invitee.id);

  return (
    <GuestInvite
      event={event}
      guestName={invitee.display_name}
      invitee={invitee}
      rsvp={rsvp}
      error={error}
      allowMaybe={event.allow_maybe !== 0}
      calendar={
        <PartyActions
          title={event.title}
          startsAt={event.starts_at}
          endsAt={event.ends_at}
          timezone={event.timezone}
          location={event.location}
          details=""
          icsPath={icsPath(invitee.token)}
          showMaps={false}
        />
      }
      maps={event.location.trim() ? <OpenInMaps location={event.location} /> : null}
    />
  );
}
