import { cookies } from "next/headers";
import { GuestFooter } from "@/app/components/guest-footer";
import { InviteCardView, themeVars } from "@/app/components/invite-card-view";
import { PartyFacts } from "@/app/components/party-facts";
import { ShareJoinForm } from "@/app/components/share-join-form";
import { getEventByShareToken, getInviteeByToken, getRsvp } from "@/lib/db";
import { formatInviteWhen, formatWhen } from "@/lib/format";
import { shareReturnCookie, shareSignupsOpen } from "@/lib/guest-list";
import { countLinkJoins } from "@/lib/guests";
import { partyImagePath } from "@/lib/party-image";
import { eventVersion } from "@/lib/party-share";
import { toPublicEvent, toPublicInvitee, toPublicRsvp } from "@/lib/public-event";
import { themeById } from "@/lib/themes";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function shareReturnToken(eventId: string) {
  try {
    const jar = await cookies();
    return jar.get(shareReturnCookie(eventId))?.value ?? "";
  } catch (err) {
    // The leak test renders this page outside a request, where there is no cookie jar.
    if (err instanceof Error && err.message.includes("outside a request scope")) return "";
    throw err;
  }
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; new?: string }>;
}) {
  const { token } = await params;
  const { error, new: addAnother } = await searchParams;
  const loaded = await getEventByShareToken(token);
  if (!loaded) notFound();
  const event = toPublicEvent(loaded);

  const saved = await shareReturnToken(loaded.id);
  const returning = saved ? await getInviteeByToken(saved) : null;
  const mine = returning && returning.event_id === loaded.id ? returning : null;
  const guest = mine ? toPublicInvitee(mine) : null;
  const rsvp = mine ? await getRsvp(mine.id) : null;
  const publicRsvp = rsvp ? toPublicRsvp(rsvp) : null;
  const wantsNew = addAnother === "1";
  const joined = await countLinkJoins(loaded.id);
  const gate = shareSignupsOpen({
    enabled: true,
    cap: loaded.share_cap,
    joined,
  });
  const showReturn = Boolean(guest && mine) && !wantsNew && !error;
  const theme = themeById(event.theme);
  const imageSrc = event.party_image_mime ? partyImagePath(event.id, eventVersion(event)) : null;

  return (
    <div className="guest-shell" style={themeVars(theme)} data-theme={theme.id}>
      <main className="guest-wrap">
        <InviteCardView
          hero
          compact
          theme={theme}
          title={event.title}
          when={formatInviteWhen(event.starts_at, event.ends_at)}
          place={event.location}
          hostName={event.host_name}
          imageSrc={imageSrc}
        />
        <PartyFacts
          when={formatWhen(event.starts_at)}
          place={event.location}
          hostName={event.host_name}
          notes={event.notes}
        />
        <div className="card stack">
          {showReturn && guest && mine ? (
            <>
              <p className="lede">You&apos;re on the list as {guest.display_name}.</p>
              {publicRsvp ? (
                <p className="hint">
                  Your reply is saved. Open your personal link if you want to change it.
                </p>
              ) : null}
              <p className="actions">
                <a className="btn" href={`/rsvp/${mine.token}`}>
                  Change your RSVP
                </a>
              </p>
              <p>
                <a href={`/p/${token}?new=1`}>Someone else is using this phone</a>
              </p>
            </>
          ) : !gate.open ? (
            <p>This party has reached its sign-up limit. Ask the host if you still need a spot.</p>
          ) : (
            <ShareJoinForm
              shareToken={token}
              event={{
                ask_comment: event.ask_comment,
                ask_adults: event.ask_adults,
                ask_kids: event.ask_kids,
                ask_infants: event.ask_infants,
                allow_maybe: event.allow_maybe === 1,
              }}
            />
          )}
        </div>
      </main>
      <GuestFooter />
    </div>
  );
}
