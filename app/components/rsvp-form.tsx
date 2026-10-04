"use client";

import { useState } from "react";
import { saveRsvp } from "@/app/actions";
import { RsvpChoice } from "@/app/components/rsvp-choice";
import type { EventRow, InviteeRow, RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: EventRow;
  invitee: InviteeRow;
  rsvp: RsvpRow | null;
};

function initialChoice(rsvp: RsvpRow | null, allowMaybe: boolean) {
  if (!rsvp) return "" as const;
  if (rsvp.attending === 1) return "yes" as const;
  if (rsvp.attending === 2 && allowMaybe) return "maybe" as const;
  if (rsvp.attending === 0) return "no" as const;
  return "" as const;
}

export function RsvpForm({ token, event, invitee, rsvp }: Props) {
  const allowMaybe = event.allow_maybe !== 0;
  const [attending, setAttending] = useState(initialChoice(rsvp, allowMaybe));
  const showCounts = attending === "yes" || attending === "maybe";

  return (
    <form action={saveRsvp} className="stack">
      <input type="hidden" name="token" value={token} />
      <p className="lede">
        Hi {invitee.display_name} — can you make it?
      </p>
      <RsvpChoice attending={attending} allowMaybe={allowMaybe} onChange={setAttending} />
      {showCounts && (event.ask_adults || event.ask_kids || event.ask_infants) ? (
        <div className="counts">
          {event.ask_adults ? (
            <label className="field">
              <span>Adults</span>
              <input
                name="adults"
                type="number"
                min={0}
                max={99}
                defaultValue={rsvp?.adults ?? 1}
              />
            </label>
          ) : null}
          {event.ask_kids ? (
            <label className="field">
              <span>Kids</span>
              <input
                name="kids"
                type="number"
                min={0}
                max={99}
                defaultValue={rsvp?.kids ?? 0}
              />
            </label>
          ) : null}
          {event.ask_infants ? (
            <label className="field">
              <span>Kids under 12 months</span>
              <input
                name="infants"
                type="number"
                min={0}
                max={99}
                defaultValue={rsvp?.infants ?? 0}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {event.ask_comment ? (
        <label className="field">
          <span>Comment (optional)</span>
          <textarea name="comment" rows={3} defaultValue={rsvp?.comment ?? ""} />
        </label>
      ) : null}
      <button className="btn" type="submit">
        Save RSVP
      </button>
    </form>
  );
}
