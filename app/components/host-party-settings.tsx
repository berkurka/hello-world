import { requestHostEmailChange, resetDashboardLink } from "@/app/actions";
import type { EventRow } from "@/lib/types";

export function HostPartySettings({
  event,
  manageToken,
  mailOn,
  canChangeEmail,
}: {
  event: EventRow;
  manageToken: string | null;
  mailOn: boolean;
  canChangeEmail: boolean;
}) {
  return (
    <section className="card section">
      <h2>Host access</h2>
      {event.host_email ? (
        <p className="lede">Recovery email: {event.host_email}</p>
      ) : (
        <p className="lede">This party has no recovery email yet.</p>
      )}
      {canChangeEmail && mailOn ? (
        <form action={requestHostEmailChange} className="stack" style={{ marginTop: "1rem" }}>
          <input type="hidden" name="eventId" value={event.id} />
          {manageToken ? <input type="hidden" name="t" value={manageToken} /> : null}
          <label className="field">
            <span>New host email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
          <p className="hint">
            We email the current host, then send a confirmation link to the new address. The email
            changes only after that link is opened.
          </p>
          <div className="actions">
            <button className="btn" type="submit">
              Change host email
            </button>
          </div>
        </form>
      ) : (
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          {mailOn
            ? "Sign in from the current host email to change it. A dashboard link cannot change the host email."
            : "Email is not set up, so the host email can't be changed from here."}
        </p>
      )}
      <form action={resetDashboardLink} className="stack" style={{ marginTop: "1.25rem" }}>
        <input type="hidden" name="eventId" value={event.id} />
        {manageToken ? <input type="hidden" name="t" value={manageToken} /> : null}
        <p className="hint">
          Reset the dashboard link if it was forwarded. Old links stop working. A sign-in from the
          host email still works.
        </p>
        <div className="actions">
          <button className="btn ghost" type="submit">
            Reset dashboard link
          </button>
        </div>
      </form>
    </section>
  );
}
