"use client";

import { SubmitButton } from "@/app/components/ui/submit-button";

export function PartyHostTools({
  eventId,
  token,
  cancelled,
  undecided,
  canEmail,
  canManageHosts,
  coHosts,
  messageUndecided,
  cancelParty,
  addCoHost,
  removeCoHost,
}: {
  eventId: string;
  token: string;
  cancelled: boolean;
  undecided: number;
  canEmail: boolean;
  canManageHosts: boolean;
  coHosts: string[];
  messageUndecided: (formData: FormData) => void | Promise<void>;
  cancelParty: (formData: FormData) => void | Promise<void>;
  addCoHost: (formData: FormData) => void | Promise<void>;
  removeCoHost: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <>
      <section className="card stack">
        <h2>Co-hosts</h2>
        {coHosts.length === 0 ? <p className="hint">No co-hosts yet.</p> : null}
        {coHosts.map((email) => (
          <div key={email} className="cohost-row">
            <span>{email}</span>
            {canManageHosts ? (
              <form
                action={removeCoHost}
                onSubmit={(event) => {
                  if (!window.confirm(`Remove ${email} as a co-host?`)) event.preventDefault();
                }}
              >
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="t" value={token} />
                <input type="hidden" name="email" value={email} />
                <SubmitButton variant="ghost" label="Remove" pendingLabel="Removing…" />
              </form>
            ) : null}
          </div>
        ))}
        {canManageHosts ? (
          <form action={addCoHost} className="stack">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="t" value={token} />
            <label className="field">
              <span>Co-host email</span>
              <input className="control" name="email" type="email" required placeholder="ana@example.com" />
            </label>
            <p className="hint">
              They sign in with that email and can manage guests, send reminders, and cancel. They cannot change
              the host email or add other co-hosts.
            </p>
            <SubmitButton label="Add co-host" pendingLabel="Adding…" />
          </form>
        ) : (
          <p className="hint">Sign in from the host email to add or remove a co-host.</p>
        )}
      </section>
      <section className="card stack">
        <h2>Remind guests</h2>
        {cancelled ? (
          <p className="hint">This party is cancelled, so reminders stay off.</p>
        ) : undecided === 0 ? (
          <p className="hint">Everyone has replied yes or no.</p>
        ) : !canEmail ? (
          <p className="hint">Email isn&apos;t set up, so reminders stay off.</p>
        ) : (
          <form action={messageUndecided} className="stack">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="t" value={token} />
            <p className="hint">
              Email {undecided} {undecided === 1 ? "guest" : "guests"} who haven&apos;t replied, or said maybe.
            </p>
            <label className="field">
              <span>Note</span>
              <textarea className="control" name="note" rows={3} maxLength={2000} placeholder="Optional note" />
            </label>
            <SubmitButton label="Email undecided guests" pendingLabel="Sending…" />
          </form>
        )}
      </section>
      <section className="card stack">
        <h2>Cancel party</h2>
        {cancelled ? (
          <p className="lede">This party is cancelled. Guests can see that, and replies are closed.</p>
        ) : (
          <form
            action={cancelParty}
            className="stack"
            onSubmit={(event) => {
              if (!window.confirm("Cancel this party? Guests will not be able to RSVP.")) event.preventDefault();
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="t" value={token} />
            <p className="hint">Cancelling keeps the party and the guest list. It does not delete them.</p>
            <label className="switch">
              <input type="checkbox" name="notify" />
              <span className="switch-track" aria-hidden="true" />
              <span className="switch-copy">Email guests that this party is cancelled</span>
            </label>
            <label className="field">
              <span>Note</span>
              <textarea className="control" name="note" rows={2} maxLength={2000} placeholder="Optional note" />
            </label>
            <SubmitButton variant="danger" label="Cancel party" pendingLabel="Cancelling…" />
          </form>
        )}
      </section>
    </>
  );
}
