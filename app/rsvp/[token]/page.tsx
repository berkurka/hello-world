import { Flash } from "@/app/components/flash";
import { RsvpForm } from "@/app/components/rsvp-form";
import { getEvent, getInviteeByToken, getRsvp } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { attendingLabel } from "@/lib/format";
import { partyImagePath } from "@/lib/party-image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const { done, error } = await searchParams;
  const invitee = await getInviteeByToken(token);
  if (!invitee) notFound();
  const event = await getEvent(invitee.event_id);
  if (!event) notFound();
  const rsvp = await getRsvp(invitee.id);
  const confirmed = done === "1" && rsvp;
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
          {confirmed ? (
            <div>
              <h2>Thanks, {invitee.display_name}.</h2>
              <p className="lede">Your RSVP is saved.</p>
              <p style={{ marginTop: "0.75rem" }}>
                Response: <strong>{attendingLabel(rsvp.attending)}</strong>
                {event.ask_adults && rsvp.attending === 1 ? ` · Adults: ${rsvp.adults}` : ""}
                {event.ask_kids && rsvp.attending === 1 ? ` · Kids: ${rsvp.kids}` : ""}
                {event.ask_infants && rsvp.attending === 1 ? ` · Under 12 months: ${rsvp.infants}` : ""}
              </p>
              {event.ask_comment && rsvp.comment ? <p>Comment: {rsvp.comment}</p> : null}
              <p style={{ marginTop: "1rem" }}>
                <Link href={`/rsvp/${token}`}>Change my RSVP</Link>
              </p>
            </div>
          ) : (
            <RsvpForm token={token} event={event} invitee={invitee} rsvp={rsvp} />
          )}
        </div>
      </div>
    </main>
  );
}
