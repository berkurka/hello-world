import { addInvitee, importInvitees, sendAllUnsent, sendInvite, updateEvent } from "@/app/actions";
import { AddGuests } from "@/app/components/add-guests";
import { BackupLink } from "@/app/components/backup-link";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { EventForm } from "@/app/components/event-form";
import { GuestList, type GuestCardModel } from "@/app/components/guest-list";
import { SharePanel } from "@/app/components/share-panel";
import { StatusChip } from "@/app/components/ui/status-chip";
import { HostPartySettings } from "@/app/components/host-party-settings";
import { WelcomeBanner } from "@/app/components/welcome-banner";
import { manageUrl, rsvpUrl } from "@/lib/app-url";
import { listInvitees } from "@/lib/db";
import {
  countSummary,
  formatInviteWhen,
  formatInvitedAt,
  headcountAttending,
  peopleLabel,
  rsvpStatus,
  type RsvpStatus,
} from "@/lib/format";
import { authorizeOrganizer, canChangeHostEmail, sessionEmailFromToken } from "@/lib/host-login";
import { INVITEE_CSV_FILENAME } from "@/lib/invitee-csv";
import { mailConfigured } from "@/lib/mail";
import { FIND_PARTIES_PATH } from "@/lib/paths";
import { peopleComing, replyProgress, statusCounts } from "@/lib/party-stats";
import { toEditableEvent } from "@/lib/public-event";
import { readHostCreds } from "@/lib/request-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const CHIP_ORDER: RsvpStatus[] = ["going", "maybe", "declined", "waiting"];

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const creds = await readHostCreds();
  const auth = await authorizeOrganizer(id, t?.trim() || null, creds);
  if (!auth) notFound();
  const { event, access } = auth;
  const formToken = access === "token" ? event.admin_token : "";
  const signedInEmail = await sessionEmailFromToken(creds.sessionToken);
  const invitees = await listInvitees(event.id);
  const canEmail = mailConfigured();
  const allowMaybe = event.allow_maybe !== 0;
  const coming = peopleComing(event, invitees, allowMaybe);
  const progress = replyProgress(invitees);
  const counts = statusCounts(invitees);
  const unsent = invitees.filter((row) => !row.invited_at).length;
  const percent = progress.total === 0 ? 0 : Math.round((progress.replied / progress.total) * 100);
  const guests: GuestCardModel[] = invitees.map((row) => ({
    id: row.id,
    name: row.display_name,
    email: row.email,
    email2: row.email2,
    status: rsvpStatus(row.attending),
    counts: headcountAttending(row.attending, allowMaybe) ? countSummary(event, row) : "",
    comment: event.ask_comment && row.comment?.trim() ? row.comment : "",
    invited: formatInvitedAt(row.invited_at),
    url: rsvpUrl(row.token),
  }));
  const dashboard = manageUrl(event.id, event.admin_token);

  return (
    <main className="wrap">
      <WelcomeBanner hostEmail={event.host_email} />
      {access === "session" && signedInEmail ? (
        <p className="hint" style={{ marginBottom: "1rem" }}>
          Signed in as {signedInEmail}.
        </p>
      ) : canEmail ? (
        <p className="hint" style={{ marginBottom: "1rem" }}>
          Anyone with this page&apos;s link can manage the party.{" "}
          <Link href={FIND_PARTIES_PATH}>Find my parties</Link>
          {event.host_email ? ` from ${event.host_email}` : ""}.
        </p>
      ) : null}
      <DashboardShell
        title={event.title}
        when={formatInviteWhen(event.starts_at, event.ends_at)}
        place={event.location}
        previewHref={
          formToken
            ? `/e/${event.id}/preview?t=${encodeURIComponent(formToken)}`
            : `/e/${event.id}/preview`
        }
        editor={
          <EventForm action={updateEvent} event={toEditableEvent(event)} submitLabel="Save changes" showPreview={false}>
            <input type="hidden" name="eventId" value={event.id} />
            {formToken ? <input type="hidden" name="t" value={formToken} /> : null}
          </EventForm>
        }
      >
        {invitees.length > 0 ? (
          <section className="card" aria-label="Headcount">
            <p className="headline-count">{peopleLabel(coming)}</p>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.replied}
              aria-label="Replies"
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="hint">
              {progress.replied} of {progress.total} replied
            </p>
            <div className="chips">
              {CHIP_ORDER.filter((status) => status !== "maybe" || counts.maybe > 0).map((status) => (
                <StatusChip key={status} status={status} count={counts[status]} />
              ))}
            </div>
            {!allowMaybe && counts.maybe > 0 ? (
              <p className="hint">
                Maybe is off. Those guests need to choose yes or no, and their counts are not included.
              </p>
            ) : null}
          </section>
        ) : (
          <section className="card stack">
            <h2>Your party is ready</h2>
            <ol className="checklist">
              <li>
                <span className="check-index">1</span>
                <span>
                  <b>Add guests</b>
                  <br />
                  <a href="#add-guest">Add your first guest</a>
                  {" · "}
                  <a href="#import-guests">Import a CSV</a>
                </span>
              </li>
              <li>
                <span className="check-index">2</span>
                <span>
                  <b>Share your link</b>
                  <br />
                  Copy it from each guest, or send the invites that haven&apos;t gone out.
                </span>
              </li>
              <li>
                <span className="check-index">3</span>
                <span>
                  <b>Watch replies come in</b>
                  <br />
                  The headcount lands at the top of this page.
                </span>
              </li>
            </ol>
          </section>
        )}
        <div className="dash-grid">
          <div className="dash-main">
            {invitees.length > 0 ? (
              <GuestList
                guests={guests}
                partyTitle={event.title}
                eventId={event.id}
                token={formToken}
                canEmail={canEmail}
                sendInvite={sendInvite}
                showNotes={event.ask_comment === 1}
              />
            ) : null}
          </div>
          <div className="dash-side stack">
            <SharePanel
              eventId={event.id}
              token={formToken}
              canEmail={canEmail}
              unsent={unsent}
              guestCount={invitees.length}
              sendAllUnsent={sendAllUnsent}
            />
            <AddGuests
              eventId={event.id}
              token={formToken}
              addInvitee={addInvitee}
              importInvitees={importInvitees}
              templateHref={`/${INVITEE_CSV_FILENAME}`}
            />
            <BackupLink url={dashboard} hostEmail={event.host_email} />
            <HostPartySettings
              event={event}
              manageToken={formToken || null}
              mailOn={canEmail}
              canChangeEmail={canChangeHostEmail(signedInEmail, event.host_email)}
              sessionEmail={signedInEmail}
            />
          </div>
        </div>
      </DashboardShell>
    </main>
  );
}
