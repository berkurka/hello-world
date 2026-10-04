import { getEventImageDataUrl, getGuestInvitee, getPublicEvent } from "@/lib/db";
import { formatInviteWhen } from "@/lib/format";
import { inviteCardImage } from "@/lib/invite-card";
import { eventVersion, versionedCacheControl } from "@/lib/party-share";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitee = await getGuestInvitee(token);
  if (!invitee) return new Response("Not found", { status: 404 });
  const event = await getPublicEvent(invitee.event_id);
  if (!event) return new Response("Not found", { status: 404 });
  const imageSrc = event.party_image_mime ? await getEventImageDataUrl(event.id) : null;
  const url = new URL(request.url);
  const og = url.searchParams.get("size") === "og";
  const image = await inviteCardImage(
    {
      guestName: invitee.display_name,
      title: event.title,
      when: formatInviteWhen(event.starts_at, event.ends_at ?? null),
      location: event.location ?? "",
      hostName: event.host_name,
      imageSrc,
      theme: event.theme,
    },
    og ? { width: 1200, height: 630 } : undefined,
  );
  image.headers.set(
    "Cache-Control",
    versionedCacheControl(url.searchParams.get("v") === eventVersion(publicVersion(event))),
  );
  image.headers.set("X-Robots-Tag", "noindex");
  return image;
}

function publicVersion(event: { updated_at?: string | null; created_at?: string | null }) {
  return { updated_at: event.updated_at, created_at: event.created_at ?? "" };
}
