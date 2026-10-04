"use client";

import { useState } from "react";
import { joinShareLink } from "@/app/actions";
import { RsvpChoice, type RsvpAnswer } from "@/app/components/ui/rsvp-choice";
import { Stepper } from "@/app/components/ui/stepper";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { BABY_LABEL } from "@/lib/format";
import { goingNeedsPeople } from "@/lib/party-stats";

export type ShareJoinDetails = {
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
};

export function ShareJoinForm({ shareToken, event }: { shareToken: string; event: ShareJoinDetails }) {
  const [attending, setAttending] = useState<RsvpAnswer | "">("");
  const [adults, setAdults] = useState(event.ask_adults ? 1 : 0);
  const [kids, setKids] = useState(0);
  const [infants, setInfants] = useState(0);
  const [error, setError] = useState("");
  const showCounts = attending === "yes" && (event.ask_adults || event.ask_kids || event.ask_infants);

  async function submit(formData: FormData) {
    if (attending === "yes" && goingNeedsPeople(event, adults, kids, infants)) {
      setError("Add at least one person.");
      return;
    }
    setError("");
    formData.set("shareToken", shareToken);
    formData.set("attending", attending);
    await joinShareLink(formData);
  }

  return (
    <form action={submit} className="stack">
      {error ? (
        <p className="flash error" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        <span>Your name</span>
        <input className="control" type="text" name="displayName" required maxLength={120} placeholder="Alex Rivera" autoComplete="name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input className="control" type="email" name="email" placeholder="alex@example.com" autoComplete="email" />
        <span className="hint">Optional. Only used if the host emails an update.</span>
      </label>
      <RsvpChoice value={attending} onChange={setAttending} />
      {showCounts ? (
        <div className="stack">
          {event.ask_adults ? <Stepper name="adults" label="Adults" value={adults} onChange={setAdults} /> : null}
          {event.ask_kids ? <Stepper name="kids" label="Kids" value={kids} onChange={setKids} /> : null}
          {event.ask_infants ? (
            <Stepper name="infants" label={BABY_LABEL} value={infants} onChange={setInfants} />
          ) : null}
        </div>
      ) : null}
      {event.ask_comment ? (
        <label className="field">
          <span>Note</span>
          <textarea className="control" name="comment" rows={3} />
        </label>
      ) : null}
      <SubmitButton label="RSVP" pendingLabel="Saving…" />
    </form>
  );
}
