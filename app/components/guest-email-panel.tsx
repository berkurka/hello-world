"use client";

import { useState } from "react";
import { messageGuests, remindWaiting } from "@/app/actions";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { DEFAULT_DAILY_EMAIL_LIMIT } from "@/lib/email-budget";

const AUDIENCES = [
  { value: "everyone", label: "Everyone" },
  { value: "going", label: "Going" },
  { value: "waiting", label: "Waiting" },
] as const;

export function GuestEmailPanel({
  eventId,
  token,
  canEmail,
  waitingGuests,
  waitingEmails,
  everyoneEmails,
  goingEmails,
  sentToday,
  dailyLimit,
}: {
  eventId: string;
  token: string;
  canEmail: boolean;
  waitingGuests: number;
  waitingEmails: number;
  everyoneEmails: number;
  goingEmails: number;
  sentToday: number;
  dailyLimit: number | null;
}) {
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("everyone");
  const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - sentToday);
  const limitLabel = dailyLimit ?? DEFAULT_DAILY_EMAIL_LIMIT;
  const counts = { everyone: everyoneEmails, going: goingEmails, waiting: waitingEmails };

  return (
    <section className="card stack">
      <h2>Email guests</h2>
      {!canEmail ? (
        <p className="hint">Email sending is off. Copy each guest link, or share the party link.</p>
      ) : (
        <>
          <p className="hint">
            {dailyLimit === null
              ? `${sentToday} emails sent today. The local daily cap is off.`
              : `${sentToday} of ${limitLabel} emails used today. ${remaining} left. Each address counts, including a second family email.`}
          </p>
          {waitingEmails > 0 ? (
            <form action={remindWaiting}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="t" value={token} />
              <SubmitButton
                className="block"
                label={`Remind ${waitingGuests} waiting (${waitingEmails} ${waitingEmails === 1 ? "email" : "emails"})`}
                pendingLabel="Sending…"
              />
              {remaining !== null && waitingEmails > remaining ? (
                <p className="hint">
                  That reminder would send {waitingEmails} emails, and {remaining} are left today.
                </p>
              ) : null}
            </form>
          ) : (
            <p className="hint">Nobody waiting has an email to remind.</p>
          )}
          <form action={messageGuests} className="stack">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="t" value={token} />
            <input type="hidden" name="audience" value={audience} />
            <div className="segmented" role="radiogroup" aria-label="Who gets the message">
              {AUDIENCES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={audience === item.value}
                  aria-selected={audience === item.value}
                  onClick={() => setAudience(item.value)}
                >
                  {item.label}
                  <span className="filter-count">{counts[item.value]}</span>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Message</span>
              <textarea
                className="control"
                name="message"
                rows={4}
                required
                maxLength={4000}
                placeholder="Write a note to your guests"
              />
            </label>
            <p className="hint">Replies go to your host email. The button sends to the group you picked.</p>
            <SubmitButton label="Send message" pendingLabel="Sending…" />
          </form>
        </>
      )}
    </section>
  );
}
