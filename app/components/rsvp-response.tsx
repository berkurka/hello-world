"use client";

import { useState } from "react";
import { RsvpForm } from "@/app/components/rsvp-form";
import { attendingLabel } from "@/lib/format";
import type { EventRow, InviteeRow, RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: EventRow;
  invitee: InviteeRow;
  rsvp: RsvpRow | null;
  openForm?: boolean;
};

export function RsvpResponse({ token, event, invitee, rsvp, openForm }: Props) {
  const [editing, setEditing] = useState(!rsvp || Boolean(openForm));
  const counts =
    rsvp && rsvp.attending === 1
      ? [
          event.ask_adults ? `Adults: ${rsvp.adults}` : "",
          event.ask_kids ? `Kids: ${rsvp.kids}` : "",
          event.ask_infants ? `Under 12 months: ${rsvp.infants}` : "",
        ].filter(Boolean)
      : [];

  return (
    <div className="stack">
      {rsvp ? (
        <div>
          <h2>Your family already RSVP'd: {attendingLabel(rsvp.attending)}</h2>
          {counts.length > 0 ? <p style={{ marginTop: "0.75rem" }}>{counts.join(" · ")}</p> : null}
          {event.ask_comment && rsvp.comment ? <p>Comment: {rsvp.comment}</p> : null}
          {!editing ? (
            <p style={{ marginTop: "1rem" }}>
              <button className="btn ghost" type="button" onClick={() => setEditing(true)}>
                Change RSVP
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
      {editing ? <RsvpForm token={token} event={event} invitee={invitee} rsvp={rsvp} /> : null}
    </div>
  );
}
