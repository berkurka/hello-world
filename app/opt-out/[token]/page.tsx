import { optOutOfGuestEmail } from "@/app/actions";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { getEvent, getInviteeByToken } from "@/lib/db";
import { toPublicEvent, toPublicInvitee } from "@/lib/public-event";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OptOutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ opted?: string }>;
}) {
  const { token } = await params;
  const { opted } = await searchParams;
  const invitee = await getInviteeByToken(token);
  if (!invitee) notFound();
  const loaded = await getEvent(invitee.event_id);
  if (!loaded) notFound();
  const event = toPublicEvent(loaded);
  const guest = toPublicInvitee(invitee);
  const done = opted === "1" || Number(invitee.email_opt_out) === 1;

  return (
    <main className="wrap">
      <section className="card stack">
        <h1>{event.title}</h1>
        {done ? (
          <p className="lede">You&apos;re opted out of emails about this party. Your RSVP is unchanged.</p>
        ) : (
          <>
            <p className="lede">Stop emails about this party for {guest.display_name}.</p>
            <form action={optOutOfGuestEmail}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton label="Opt out" pendingLabel="Saving…" />
            </form>
          </>
        )}
      </section>
    </main>
  );
}
