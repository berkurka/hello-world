import { requestHostEmailChange, resetDashboardLink } from "@/app/actions";
import type { EventRow } from "@/lib/types";

export function HostPartySettings({
  event,
  manageToken,
  mailOn,
}: {
  event: EventRow;
  manageToken: string | null;
  mailOn: boolean;
}) {
  return (
    <section className="card section">
      <h2>Host access</h2>
      {event.host_email ? (
        <p className="lede">Recovery email: {event.host_email}</p>
      ) : (
        <p className="lede">This party has no recovery email yet.</p>
      )}
      {mailOn ? (
        <form action={requestHostEmailChange} className="stack" style={{ marginTop: "1rem" }}>
          <input type="hidden" name="eventId" value={event.id} />
          {manageToken ? <input type="hidden" name="t" value={manageToken} /> : null}
          <label className="field">
            <span>{event.host_email ? "New host email" : "Recovery email"}</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
          <p className="hint">
            We send a confirmation link to that address. The email changes only after it is opened.
          </p>
          <div className="actions">
            <button className="btn" type="submit">
              {event.host_email ? "Change host email" : "Add recovery email"}
            </button>
          </div>
        </form>
      ) : (
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          Email is not set up, so the host email can&apos;t be changed from here.
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
