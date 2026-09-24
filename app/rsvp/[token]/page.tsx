import { Flash } from "@/app/components/flash";
import { RsvpResponse } from "@/app/components/rsvp-response";
import { getEvent, getInviteeByToken, getRsvp } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { partyImagePath } from "@/lib/party-image";
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
  const photo = event.party_image_mime ? partyImagePath(event.id) : null;

  return (
    <main className={photo ? "rsvp-page has-photo" : "rsvp-page"}>
      {photo ? (
        <>
          <div className="rsvp-photo" aria-hidden="true">
            <img src={photo} alt="" />
          </div>
          <div className="rsvp-hero" aria-hidden="true">
            <img src={photo} alt="" />
          </div>
        </>
      ) : null}
      <div className="wrap">
        <div className="card stack">
          <img
            className="card-img"
            src={`/api/invite-card/${token}`}
            alt={`Invitation for ${invitee.display_name}`}
          />
          <div>
            <h1>{event.title}</h1>
            <p className="lede">
              {formatWhen(event.starts_at)}
              {event.location ? ` · ${event.location}` : ""}
              <br />
              Hosted by {event.host_name}
            </p>
          </div>
          <Flash error={error} />
          <RsvpResponse
            token={token}
            event={event}
            invitee={invitee}
            rsvp={rsvp}
            openForm={Boolean(error)}
          />
        </div>
      </div>
    </main>
  );
}
