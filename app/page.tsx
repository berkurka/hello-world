import { createEvent } from "@/app/actions";
import { EventForm } from "@/app/components/event-form";
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
        <EventForm action={createEvent} submitLabel="Create event" />
      </div>
    </main>
  );
}
