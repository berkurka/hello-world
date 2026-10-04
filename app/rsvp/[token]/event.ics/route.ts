import { rsvpUrl } from "@/lib/app-url";
import { buildIcs } from "@/lib/calendar";
import { getEvent, getInviteeByToken } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitee = await getInviteeByToken(token);
  if (!invitee) return new Response("Not found", { status: 404 });
  const event = await getEvent(invitee.event_id);
  if (!event) return new Response("Not found", { status: 404 });
  const ics = buildIcs({
    uid: `${invitee.id}@partyz`,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    location: event.location,
    description: `RSVP: ${rsvpUrl(invitee.token)}`,
  });
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="party.ics"',
      "Cache-Control": "private, no-cache",
    },
  });
}
