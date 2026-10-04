import { cookies } from "next/headers";
import { GuestFooter } from "@/app/components/guest-footer";
import { InviteCardView, themeVars } from "@/app/components/invite-card-view";
import { PartyFacts } from "@/app/components/party-facts";
import { ShareJoinForm } from "@/app/components/share-join-form";
import { getEventByShareToken, getInviteeByToken } from "@/lib/db";
import { formatInviteWhen, formatWhen } from "@/lib/format";
import { shareReturnCookie, shareSignupsOpen } from "@/lib/guest-list";
import { countLinkJoins } from "@/lib/guests";
import { partyImagePath } from "@/lib/party-image";
import { themeById } from "@/lib/themes";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; new?: string }>;
}) {
  const { token } = await params;
  const { error, new: addAnother } = await searchParams;
  const event = await getEventByShareToken(token);
  if (!event) notFound();

  const jar = await cookies();
  const saved = jar.get(shareReturnCookie(event.id))?.value ?? "";
  const returning = saved ? await getInviteeByToken(saved) : null;
  const mine = returning && returning.event_id === event.id ? returning : null;
  const wantsNew = addAnother === "1";
  const joined = await countLinkJoins(event.id);
  const gate = shareSignupsOpen({
    enabled: true,
    cap: event.share_cap,
    joined,
  });
  const showReturn = Boolean(mine) && !wantsNew && !error;
  const theme = themeById(event.theme);
  const imageSrc = event.party_image_mime ? partyImagePath(event.id) : null;

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
          {showReturn && mine ? (
            <>
              <p className="lede">You&apos;re on the list as {mine.display_name}.</p>
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
              }}
            />
          )}
        </div>
      </main>
      <GuestFooter />
    </div>
  );
}
