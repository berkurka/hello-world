import { createEvent } from "@/app/actions";
import { EventForm } from "@/app/components/event-form";
import { InviteCardView } from "@/app/components/invite-card-view";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    draft?: string;
    title?: string;
    location?: string;
    hostName?: string;
    hostEmail?: string;
    startsDate?: string;
    startsTime?: string;
    askComment?: string;
    askAdults?: string;
    askKids?: string;
    askInfants?: string;
  }>;
}) {
  const params = await searchParams;
  const draft =
    params.draft === "1"
      ? {
          title: params.title,
          location: params.location,
          hostName: params.hostName,
          hostEmail: params.hostEmail,
          startsDate: params.startsDate,
          startsTime: params.startsTime,
          askComment: params.askComment === "1",
          askAdults: params.askAdults === "1",
          askKids: params.askKids === "1",
          askInfants: params.askInfants === "1",
        }
      : undefined;
  return (
    <main className="wrap">
      <section className="hero-home">
        <div>
          <h1>Plan the party. Share the invite.</h1>
          <p className="lede">
            No account to start. Create the party, share a link, and see who is coming.
          </p>
          <p className="cta-row" style={{ marginTop: "1.1rem" }}>
            <a className="btn" href="#create">
              Create an invite
            </a>
          </p>
        </div>
        <InviteCardView
          theme="classic"
          title="Maya's 7th Birthday"
          guestName="Priya"
          when="Sat, Oct 17 · 2:00 PM"
          place="Riverside Park"
          hostName="Bernardo"
        />
      </section>
      <ol className="steps">
        <li className="step">
          <span className="step-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20h4l10-10-4-4L4 16v4z" />
              <path d="M13 7l4 4" />
            </svg>
          </span>
          <span>
            <b>Create the party</b>
            Title, time, and a theme.
          </span>
        </li>
        <li className="step">
          <span className="step-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
              <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
            </svg>
          </span>
          <span>
            <b>Share the invite</b>
            Each guest gets a link.
          </span>
        </li>
        <li className="step">
          <span className="step-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="9" r="2.4" />
              <circle cx="16" cy="9" r="2.4" />
              <path d="M4.5 18c.8-2.2 2.4-3.3 4.5-3.3S12.7 15.8 13.5 18" />
              <path d="M12.5 18c.6-1.6 1.8-2.6 3.5-2.6 1.6 0 2.8.8 3.5 2.2" />
            </svg>
          </span>
          <span>
            <b>Watch the replies</b>
            Headcount, on your phone.
          </span>
        </li>
      </ol>
      <div className="card" id="create">
        <h2>Create an invite</h2>
        <p className="lede">A title, a time, and your email. That&apos;s enough to start.</p>
        <EventForm
          action={createEvent}
          submitLabel="Create an invite"
          draft={draft}
          initialError={params.error}
        />
      </div>
    </main>
  );
}
