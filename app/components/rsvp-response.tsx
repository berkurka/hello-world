"use client";

import { useState } from "react";
import { RsvpForm } from "@/app/components/rsvp-form";
import { countSummary, weekdayName } from "@/lib/format";
import type { EventRow, InviteeRow, RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: EventRow;
  invitee: InviteeRow;
  rsvp: RsvpRow | null;
  openForm?: boolean;
  passed?: boolean;
  allowMaybe?: boolean;
};

export function RsvpResponse({ token, event, invitee, rsvp, openForm, passed, allowMaybe }: Props) {
  const [editing, setEditing] = useState(!rsvp || Boolean(openForm));
  if (passed) {
    return (
      <div className="card stack confirm">
        <h2>This party was on {formatPassed(event.starts_at)}.</h2>
        {rsvp ? <Answer event={event} hostName={event.host_name} rsvp={rsvp} /> : null}
      </div>
    );
  }
  if (rsvp && !editing) {
    return (
      <div className="card stack confirm">
        <Answer event={event} hostName={event.host_name} rsvp={rsvp} />
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
  rsvp,
}: {
  event: EventRow;
  hostName: string;
  rsvp: RsvpRow;
}) {
  const weekday = weekdayName(event.starts_at);
  const counts = rsvp.attending === 1 ? countSummary(event, rsvp) : "";
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
        <p className="lede">We&apos;ll let {hostName} know.</p>
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
