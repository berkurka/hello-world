"use client";

import { useState } from "react";
import { saveRsvp } from "@/app/actions";
import type { EventRow, InviteeRow, RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: EventRow;
  invitee: InviteeRow;
  rsvp: RsvpRow | null;
};

export function RsvpForm({ token, event, invitee, rsvp }: Props) {
  const [attending, setAttending] = useState<"yes" | "no" | "">(
    rsvp ? (rsvp.attending === 1 ? "yes" : "no") : "",
  );
  const showCounts = attending === "yes";

  return (
    <form action={saveRsvp} className="stack">
      <input type="hidden" name="token" value={token} />
      <p className="lede">
        Hi {invitee.display_name} — can you make it?
      </p>
      <div className="choice">
        <label className={attending === "yes" ? "pick on" : "pick"}>
          <input
            type="radio"
            name="attending"
            value="yes"
            required
            checked={attending === "yes"}
            onChange={() => setAttending("yes")}
          />
          Yes
        </label>
        <label className={attending === "no" ? "pick on" : "pick"}>
          <input
            type="radio"
            name="attending"
            value="no"
            required
            checked={attending === "no"}
            onChange={() => setAttending("no")}
          />
          No
        </label>
      </div>
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
