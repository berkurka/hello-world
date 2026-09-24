import { createEvent } from "@/app/actions";
import { EventForm } from "@/app/components/event-form";
import { mailConfigured } from "@/lib/mail";

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
  const { error } = params;
  const canEmail = mailConfigured();
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
      <div className="hero">
        <p className="kicker">Partyz</p>
        <h1>Plan and organize your party here in 3 steps.</h1>
        <p className="lede">
          No account to start. Create the party, share a link, and see who is coming.
        </p>
      </div>
      <ol className="steps">
        <li className="step">
          <b>Step 1</b>
          Create your party
        </li>
        <li className="step">
          <b>Step 2</b>
          Share the invite link
        </li>
        <li className="step">
          <b>Step 3</b>
          Track who&apos;s coming
        </li>
      </ol>
      <p className="lede" style={{ marginBottom: "1.5rem" }}>
        {canEmail
          ? "Share each guest's unique link. Email sending is optional once the party exists."
          : "Share each guest's unique link — copy it from your dashboard. Email sending is optional and off until you configure it."}
      </p>
      <p className="cta-row">
        <a className="btn" href="#create">
          Create your party
        </a>
      </p>
      <div className="card" id="create">
        <h2>Create your party</h2>
        <p className="lede">Title, when, where, and your email. That's enough to get started.</p>
        <EventForm
          action={createEvent}
          submitLabel="Create your party"
          draft={draft}
          initialError={error}
        />
      </div>
    </main>
  );
}
