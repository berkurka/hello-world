import { getEvent, getEventImageDataUrl, getInviteeByToken } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { inviteCardImage } from "@/lib/invite-card";
import { versionedCacheControl } from "@/lib/party-share";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitee = await getInviteeByToken(token);
  if (!invitee) return new Response("Not found", { status: 404 });
  const event = await getEvent(invitee.event_id);
  if (!event) return new Response("Not found", { status: 404 });
  const imageSrc = event.party_image_mime ? await getEventImageDataUrl(event.id) : null;
  const url = new URL(request.url);
  const image = inviteCardImage(
    {
      guestName: invitee.display_name,
      title: event.title,
      when: formatWhen(event.starts_at),
      location: event.location,
      hostName: event.host_name,
      imageSrc,
    },
    url.searchParams.get("size") === "og" ? "og" : "card",
  );
  image.headers.set("Cache-Control", versionedCacheControl(url.searchParams.has("v")));
  return image;
}
