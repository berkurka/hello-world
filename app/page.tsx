import { createEvent } from "@/app/actions";
import { EventForm } from "@/app/components/event-form";
import { Flash } from "@/app/components/flash";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    draft?: string;
    title?: string;
    location?: string;
    hostName?: string;
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
  const draft =
    params.draft === "1"
      ? {
          title: params.title,
          location: params.location,
          hostName: params.hostName,
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
        <h1>Invite people. Get a count.</h1>
        <p className="lede">
          Create an event, email a personalized card, and collect yes/no RSVPs with the guest
          counts you care about.
        </p>
      </div>
      <div className="card">
        <Flash error={error} />
        <h2>New event</h2>
        <EventForm action={createEvent} submitLabel="Create event" draft={draft} />
      </div>
    </main>
  );
}
