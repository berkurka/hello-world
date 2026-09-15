import { createEvent } from "@/app/actions";
import { EventFields } from "@/app/components/event-fields";
import { Flash } from "@/app/components/flash";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="wrap">
      <div className="hero">
        <h1>Invite people. Get a count.</h1>
        <p className="lede">
          Create an event, email a personalized card, and collect yes/no RSVPs with the guest
          counts you care about.
        </p>
      </div>
      <div className="card">
        <Flash error={error} />
        <h2>New event</h2>
        <form action={createEvent} className="stack" style={{ marginTop: "1rem" }}>
          <EventFields />
          <button className="btn" type="submit">
            Create event
          </button>
        </form>
      </div>
    </main>
  );
}
