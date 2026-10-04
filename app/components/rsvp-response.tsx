"use client";

import { useState } from "react";
import { RsvpForm } from "@/app/components/rsvp-form";
import { countSummary, familyRsvpHeading, weekdayName } from "@/lib/format";
import type { PublicEvent, PublicInvitee } from "@/lib/public-event";
import type { RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: PublicEvent;
  invitee: PublicInvitee;
  rsvp: RsvpRow | null;
  openForm?: boolean;
  passed?: boolean;
  allowMaybe?: boolean;
};

export function RsvpResponse({ token, event, invitee, rsvp, openForm, passed, allowMaybe }: Props) {
  const staleMaybe = Boolean(rsvp && rsvp.attending === 2 && !allowMaybe);
  const [editing, setEditing] = useState(!rsvp || Boolean(openForm) || staleMaybe);
  if (passed) {
    return (
      <div className="card stack confirm">
        <h2>This party was on {formatPassed(event.starts_at)}.</h2>
        {rsvp ? <Answer event={event} hostName={event.host_name} invitee={invitee} rsvp={rsvp} /> : null}
      </div>
    );
  }
  if (rsvp && !editing) {
    return (
      <div className="card stack confirm">
        <Answer event={event} hostName={event.host_name} invitee={invitee} rsvp={rsvp} />
        <p>
          <button className="btn ghost" type="button" onClick={() => setEditing(true)}>
            Change response
          </button>
        </p>
      </div>
    );
  }
  return (
    <div className="card">
      {staleMaybe ? (
        <p className="lede">Maybe is no longer an option for this party. Please choose yes or no.</p>
      ) : null}
      <RsvpForm token={token} event={event} invitee={invitee} rsvp={rsvp} allowMaybe={allowMaybe} />
    </div>
  );
}

function formatPassed(startsAt: string) {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "this date";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function Answer({
  event,
  hostName,
  invitee,
  rsvp,
}: {
  event: PublicEvent;
  hostName: string;
  invitee: PublicInvitee;
  rsvp: RsvpRow;
}) {
  const weekday = weekdayName(event.starts_at);
  const counts = rsvp.attending === 1 || rsvp.attending === 2 ? countSummary(event, rsvp) : "";
  if (invitee.family) {
    return (
      <div>
        <h2>{familyRsvpHeading(rsvp.attending)}</h2>
        {counts ? <p className="lede">{counts}</p> : null}
        {event.ask_comment && rsvp.comment ? <p>Note: {rsvp.comment}</p> : null}
      </div>
    );
  }
  if (rsvp.attending === 1) {
    return (
      <div>
        <h2>{weekday ? `You're going! See you ${weekday}.` : "You're going!"}</h2>
        {counts ? <p className="lede">{counts}</p> : null}
        {event.ask_comment && rsvp.comment ? <p>Note: {rsvp.comment}</p> : null}
      </div>
    );
  }
  if (rsvp.attending === 2) {
    return (
      <div>
        <h2>You might come.</h2>
        {counts ? <p className="lede">{counts}</p> : <p className="lede">We&apos;ll let {hostName} know.</p>}
      </div>
    );
  }
  return (
    <div>
      <h2>Thanks for letting {hostName} know.</h2>
      <p className="lede">You can&apos;t make it.</p>
    </div>
  );
}
