import { CopyButton } from "@/app/components/copy-button";
import { getEventForOrganizer } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { manageUrl } from "@/lib/app-url";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PartyCreatedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; mail?: string; mailError?: string }>;
}) {
  const { id } = await params;
  const { t, mail, mailError } = await searchParams;
  if (!t) notFound();
  const event = await getEventForOrganizer(id, t);
  if (!event) notFound();

  const dashboard = manageUrl(event.id, event.admin_token);
  const mailState = mail === "sent" || mail === "failed" || mail === "skipped" ? mail : mailConfigured() ? "sent" : "skipped";

  return (
    <main className="wrap">
      <div className="card stack">
        <div>
          <p className="kicker">Partyz</p>
          <h1>Party created — check your email to open the dashboard</h1>
          <p className="lede" style={{ marginTop: "0.75rem" }}>
            {event.title}
            {event.host_email ? ` · ${event.host_email}` : ""}
          </p>
        </div>
        {mailState === "sent" ? (
          <p className="flash notice">
            We emailed a dashboard link. Save the URL below too, in case the message is delayed.
          </p>
        ) : mailState === "failed" ? (
          <p className="flash error">
            The party was created, but we could not send email. Copy the dashboard link below and
            keep it.
            {mailError ? ` ${mailError}` : ""}
          </p>
        ) : (
          <p className="flash notice">
            Email is not configured, so we did not send a message. Copy the dashboard link below
            and keep it.
          </p>
        )}
        <div>
          <p className="field">
            <span>Dashboard link (save this)</span>
          </p>
          <div className="copy-row" style={{ marginTop: "0.4rem" }}>
            <p className="mono">{dashboard}</p>
            <CopyButton text={dashboard} label="Copy link" />
          </div>
        </div>
        <p className="hint">
          Bookmark it. The secret in the URL is how you manage the party — there is still no login.
        </p>
        <p>
          <Link className="btn" href={`/e/${event.id}/manage?t=${encodeURIComponent(event.admin_token)}`}>
            Open dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
