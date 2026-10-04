"use client";

import { useState } from "react";
import { saveRsvp } from "@/app/actions";
import { Stepper } from "@/app/components/ui/stepper";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { RsvpChoice, type RsvpAnswer } from "@/app/components/ui/rsvp-choice";
import { BABY_LABEL } from "@/lib/format";
import { goingNeedsPeople } from "@/lib/party-stats";
import type { PublicEvent, PublicInvitee } from "@/lib/public-event";
import type { RsvpRow } from "@/lib/types";

type Props = {
  token: string;
  event: PublicEvent;
  invitee: PublicInvitee;
  rsvp: RsvpRow | null;
  /** Pass true once the server accepts a Maybe answer. */
  allowMaybe?: boolean;
};

function initialCount(
  kind: "adults" | "kids" | "infants",
  event: PublicEvent,
  rsvp: RsvpRow | null,
) {
  if (rsvp && (rsvp.attending === 1 || rsvp.attending === 2)) return rsvp[kind] ?? 0;
  if (kind === "adults" && event.ask_adults) return 1;
  if (kind === "kids" && event.ask_kids && !event.ask_adults) return 1;
  if (kind === "infants" && event.ask_infants && !event.ask_adults && !event.ask_kids) return 1;
  return 0;
}

function initialAnswer(rsvp: RsvpRow | null, allowMaybe: boolean): RsvpAnswer | "" {
  if (!rsvp) return "";
  if (rsvp.attending === 1) return "yes";
  if (rsvp.attending === 2 && allowMaybe) return "maybe";
  if (rsvp.attending === 2) return "";
  return "no";
}

export function RsvpForm({ token, event, invitee, rsvp, allowMaybe = false }: Props) {
  const [attending, setAttending] = useState<RsvpAnswer | "">(initialAnswer(rsvp, allowMaybe));
  const [adults, setAdults] = useState(initialCount("adults", event, rsvp));
  const [kids, setKids] = useState(initialCount("kids", event, rsvp));
  const [infants, setInfants] = useState(initialCount("infants", event, rsvp));
  const [error, setError] = useState("");
  const showCounts =
    (attending === "yes" || attending === "maybe") && (event.ask_adults || event.ask_kids || event.ask_infants);

  async function submit(formData: FormData) {
    if ((attending === "yes" || attending === "maybe") && goingNeedsPeople(event, adults, kids, infants)) {
      setError("Add at least one person.");
      return;
    }
    setError("");
    formData.set("token", token);
    formData.set("attending", attending);
    if (event.ask_adults) formData.set("adults", String(adults));
    if (event.ask_kids) formData.set("kids", String(kids));
    if (event.ask_infants) formData.set("infants", String(infants));
    await saveRsvp(formData);
  }

  return (
    <form action={submit} className="stack">
      <p className="lede">Hi {invitee.display_name}, can you make it?</p>
      {error ? (
        <p className="flash error" role="alert">
          {error}
        </p>
      ) : null}
      <RsvpChoice value={attending} onChange={setAttending} allowMaybe={allowMaybe} />
      {showCounts ? (
        <div className="stack">
          {event.ask_adults ? (
            <Stepper name="adults" label="Adults" value={adults} onChange={setAdults} />
          ) : null}
          {event.ask_kids ? <Stepper name="kids" label="Kids" value={kids} onChange={setKids} /> : null}
          {event.ask_infants ? (
            <Stepper name="infants" label={BABY_LABEL} value={infants} onChange={setInfants} />
          ) : null}
        </div>
      ) : null}
      {event.ask_comment ? (
        <label className="field">
          <span>Note for {event.host_name}</span>
          <textarea className="control" name="comment" rows={3} defaultValue={rsvp?.comment ?? ""} />
        </label>
      ) : null}
      <div className="sticky-submit">
        <SubmitButton className="block" label="Send RSVP" pendingLabel="Sending…" />
      </div>
    </form>
  );
}
