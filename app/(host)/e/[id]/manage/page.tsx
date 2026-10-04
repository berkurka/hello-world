import { addInvitee, importInvitees, sendAllUnsent, sendInvite, updateEvent } from "@/app/actions";
import { AddGuests } from "@/app/components/add-guests";
import { BackupLink } from "@/app/components/backup-link";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { EventForm } from "@/app/components/event-form";
import { GuestList, type GuestCardModel } from "@/app/components/guest-list";
import { SharePanel } from "@/app/components/share-panel";
import { StatusChip } from "@/app/components/ui/status-chip";
import { WelcomeBanner } from "@/app/components/welcome-banner";
import { manageUrl, rsvpUrl } from "@/lib/app-url";
import { getEventForOrganizer, listInvitees } from "@/lib/db";
import {
  countSummary,
  formatInviteWhen,
  formatInvitedAt,
  peopleLabel,
  rsvpStatus,
  type RsvpStatus,
} from "@/lib/format";
import { INVITEE_CSV_FILENAME } from "@/lib/invitee-csv";
import { mailConfigured } from "@/lib/mail";
import { peopleComing, replyProgress, statusCounts } from "@/lib/party-stats";
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
  if (!t) notFound();
  const event = await getEventForOrganizer(id, t);
  if (!event) notFound();
  const invitees = await listInvitees(event.id);
  const canEmail = mailConfigured();
  const coming = peopleComing(event, invitees);
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
    counts: row.attending === 1 ? countSummary(event, row) : "",
    comment: event.ask_comment && row.comment?.trim() ? row.comment : "",
    invited: formatInvitedAt(row.invited_at),
    url: rsvpUrl(row.token),
  }));
  const dashboard = manageUrl(event.id, event.admin_token);

  return (
    <main className="wrap">
      <WelcomeBanner hostEmail={event.host_email} />
      <DashboardShell
        title={event.title}
        when={formatInviteWhen(event.starts_at, event.ends_at)}
        place={event.location}
        previewHref={`/e/${event.id}/preview?t=${encodeURIComponent(t)}`}
        editor={
          <EventForm action={updateEvent} event={event} submitLabel="Save changes" showPreview={false}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="t" value={t} />
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
                token={t}
                canEmail={canEmail}
                sendInvite={sendInvite}
              />
            ) : null}
          </div>
          <div className="dash-side stack">
            <SharePanel
              eventId={event.id}
              token={t}
              canEmail={canEmail}
              unsent={unsent}
              guestCount={invitees.length}
              sendAllUnsent={sendAllUnsent}
            />
            <AddGuests
              eventId={event.id}
              token={t}
              addInvitee={addInvitee}
              importInvitees={importInvitees}
              templateHref={`/${INVITEE_CSV_FILENAME}`}
            />
            <BackupLink url={dashboard} hostEmail={event.host_email} />
          </div>
        </div>
      </DashboardShell>
    </main>
  );
}
