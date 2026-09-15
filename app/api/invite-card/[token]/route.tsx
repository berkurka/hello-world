import { getEvent, getInviteeByToken } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { inviteCardImage } from "@/lib/invite-card";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitee = await getInviteeByToken(token);
  if (!invitee) return new Response("Not found", { status: 404 });
  const event = await getEvent(invitee.event_id);
  if (!event) return new Response("Not found", { status: 404 });
  return inviteCardImage({
    guestName: invitee.display_name,
    title: event.title,
    when: formatWhen(event.starts_at),
    location: event.location,
    hostName: event.host_name,
  });
}
