import { addInvitee, importInvitees, sendAllUnsent, sendInvite, updateEvent } from "@/app/actions";
import { CopyButton } from "@/app/components/copy-button";
import { EventForm } from "@/app/components/event-form";
import { Flash } from "@/app/components/flash";
import { getEventForOrganizer, listInvitees } from "@/lib/db";
import { attendingLabel, formatWhen } from "@/lib/format";
import { rsvpUrl } from "@/lib/app-url";
import { INVITEE_CSV_FILENAME } from "@/lib/invitee-csv";
import { mailConfigured } from "@/lib/mail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { t, error, notice } = await searchParams;
  if (!t) notFound();
  const event = await getEventForOrganizer(id, t);
  if (!event) notFound();
  const invitees = await listInvitees(event.id);
  const canEmail = mailConfigured();

  const columnCount =
    4 +
    (event.ask_adults ? 1 : 0) +
    (event.ask_kids ? 1 : 0) +
    (event.ask_infants ? 1 : 0) +
    (event.ask_comment ? 1 : 0);
  const yes = invitees.filter((row) => row.attending === 1);
  const no = invitees.filter((row) => row.attending === 0);
  const pending = invitees.filter((row) => row.attending === null);
  const adults = yes.reduce((sum, row) => sum + (row.adults ?? 0), 0);
  const kids = yes.reduce((sum, row) => sum + (row.kids ?? 0), 0);
  const infants = yes.reduce((sum, row) => sum + (row.infants ?? 0), 0);

  return (
    <main className="wrap">
      <Flash error={error} notice={notice} />
      <p className="warn">
        Bookmark this page. The secret in the URL is how you manage the event — there is no login.
      </p>
      <div className="card">
        <h1>{event.title}</h1>
        <p className="lede">
          {formatWhen(event.starts_at)}
          {event.location ? ` · ${event.location}` : ""}
          <br />
          Hosted by {event.host_name}
        </p>
      </div>

      <section className="section card">
        <h2>RSVPs</h2>
        <div className="totals">
          <div>
            <b>{yes.length}</b>
            Yes
          </div>
          <div>
            <b>{no.length}</b>
            No
          </div>
          <div>
            <b>{pending.length}</b>
            Pending
          </div>
          {event.ask_adults ? (
            <div>
              <b>{adults}</b>
              Adults
            </div>
          ) : null}
          {event.ask_kids ? (
            <div>
              <b>{kids}</b>
              Kids
            </div>
          ) : null}
          {event.ask_infants ? (
            <div>
              <b>{infants}</b>
              Under 12 months
            </div>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>RSVP</th>
                {event.ask_adults ? <th>Adults</th> : null}
                {event.ask_kids ? <th>Kids</th> : null}
                {event.ask_infants ? <th>Infants</th> : null}
                {event.ask_comment ? <th>Comment</th> : null}
                <th>Invite</th>
              </tr>
            </thead>
            <tbody>
              {invitees.length === 0 ? (
                <tr>
                  <td colSpan={columnCount}>No invitees yet.</td>
                </tr>
              ) : (
                invitees.map((row) => (
                  <tr key={row.id}>
                    <td>{row.display_name}</td>
                    <td>
                      {row.email}
                      {row.email2 ? (
                        <>
                          <br />
                          {row.email2}
                        </>
                      ) : null}
                    </td>
                    <td>{attendingLabel(row.attending)}</td>
                    {event.ask_adults ? <td>{row.attending === 1 ? row.adults : "—"}</td> : null}
                    {event.ask_kids ? <td>{row.attending === 1 ? row.kids : "—"}</td> : null}
                    {event.ask_infants ? <td>{row.attending === 1 ? row.infants : "—"}</td> : null}
                    {event.ask_comment ? <td>{row.comment ?? ""}</td> : null}
                    <td>
                      <div className="copy-row">
                        <p className="mono">{rsvpUrl(row.token)}</p>
                        <CopyButton text={rsvpUrl(row.token)} />
                      </div>
                      {canEmail ? (
                        <form action={sendInvite}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="t" value={t} />
                          <input type="hidden" name="inviteeId" value={row.id} />
                          <button className="btn ghost small" type="submit">
                            {row.invited_at ? "Resend email" : "Send email"}
                          </button>
                        </form>
                      ) : (
                        <p className="hint">Copy the link to invite. Email sending is off.</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2 section">
        <section className="card">
          <h2>Add invitee</h2>
          <form action={addInvitee} className="stack" style={{ marginTop: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="t" value={t} />
            <label className="field">
              <span>Family or guest name</span>
              <input name="displayName" required placeholder="The Rivera family" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required placeholder="alex@example.com" />
            </label>
            <label className="field">
              <span>Second email</span>
              <input name="email2" type="email" placeholder="sam@example.com" />
              <span className="hint">Optional. Both addresses get the same RSVP link.</span>
            </label>
            <div className="actions">
              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </form>
          <div className="import-box">
            <h3>Import CSV</h3>
            <p className="hint">
              Download a template with name, email, and an optional second email. One row is
              one family. Bad rows are skipped; valid ones still import.
            </p>
            <p className="actions" style={{ marginTop: "0.75rem" }}>
              <a className="btn ghost" href={`/${INVITEE_CSV_FILENAME}`} download={INVITEE_CSV_FILENAME}>
                Download template
              </a>
            </p>
            <form action={importInvitees} className="stack" style={{ marginTop: "0.85rem" }}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="t" value={t} />
              <label className="field">
                <span>CSV file</span>
                <input name="csv" type="file" accept=".csv,text/csv,text/plain" required />
              </label>
              <div className="actions">
                <button className="btn" type="submit">
                  Import CSV
                </button>
              </div>
            </form>
          </div>
          {canEmail ? (
            <form action={sendAllUnsent} style={{ marginTop: "0.75rem" }}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="t" value={t} />
              <button className="btn ghost" type="submit">
                Email everyone who has not been sent an invite
              </button>
            </form>
          ) : (
            <p className="hint" style={{ marginTop: "0.75rem" }}>
              Email sending is off. Copy each RSVP link from the table to share the invite.
            </p>
          )}
          {canEmail ? (
            <p className="hint" style={{ marginTop: "0.75rem" }}>
              You can also copy the unique RSVP link from the table if you would rather share it
              yourself.
            </p>
          ) : null}
        </section>

        <section className="card">
          <h2>Edit event</h2>
          <EventForm action={updateEvent} event={event} submitLabel="Save changes">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="t" value={t} />
          </EventForm>
        </section>
      </div>
    </main>
  );
}
