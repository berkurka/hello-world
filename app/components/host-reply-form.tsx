"use client";

import { useState } from "react";
import { setHostRsvp } from "@/app/actions";
import { RsvpChoice, type RsvpAnswer } from "@/app/components/ui/rsvp-choice";
import { Stepper } from "@/app/components/ui/stepper";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { BABY_LABEL } from "@/lib/format";

export function HostReplyForm({
  eventId,
  token,
  inviteeId,
  attending,
  comment,
  adults,
  kids,
  infants,
  askComment,
  askAdults,
  askKids,
  askInfants,
  allowMaybe = false,
}: {
  eventId: string;
  token: string;
  inviteeId: string;
  attending: number | null;
  comment: string;
  adults: number;
  kids: number;
  infants: number;
  askComment: boolean;
  askAdults: boolean;
  askKids: boolean;
  askInfants: boolean;
  allowMaybe?: boolean;
}) {
  const initial: RsvpAnswer | "" = attending === 1 ? "yes" : attending === 2 ? "maybe" : attending === 0 ? "no" : "";
  const [answer, setAnswer] = useState<RsvpAnswer | "">(initial);
  const [adultCount, setAdultCount] = useState(adults);
  const [kidCount, setKidCount] = useState(kids);
  const [infantCount, setInfantCount] = useState(infants);
  const showCounts = (answer === "yes" || (allowMaybe && answer === "maybe")) && (askAdults || askKids || askInfants);

  return (
    <form action={setHostRsvp} className="stack">
      <h3>Record a reply</h3>
      <p className="hint">Use this when someone answered by text or phone. The list will say added by host.</p>
      <input type="hidden" name="eventId" value={eventId} />
      {token ? <input type="hidden" name="t" value={token} /> : null}
      <input type="hidden" name="inviteeId" value={inviteeId} />
      <RsvpChoice value={answer} onChange={setAnswer} allowMaybe={allowMaybe} />
      {showCounts ? (
        <div className="stack">
          {askAdults ? <Stepper name="adults" label="Adults" value={adultCount} onChange={setAdultCount} /> : null}
          {askKids ? <Stepper name="kids" label="Kids" value={kidCount} onChange={setKidCount} /> : null}
          {askInfants ? (
            <Stepper name="infants" label={BABY_LABEL} value={infantCount} onChange={setInfantCount} />
          ) : null}
        </div>
      ) : null}
      {askComment ? (
        <label className="field">
          <span>Note</span>
          <textarea className="control" name="comment" rows={2} defaultValue={comment} />
        </label>
      ) : null}
      <SubmitButton label="Save reply" pendingLabel="Saving…" />
    </form>
  );
}
