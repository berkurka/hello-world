import { getEventImage, getPublicEvent } from "@/lib/db";
import { eventVersion, versionedCacheControl } from "@/lib/party-share";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getPublicEvent(id);
  if (!event?.party_image_mime) return new Response("Not found", { status: 404 });
  const image = await getEventImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  const versioned =
    new URL(request.url).searchParams.get("v") ===
    eventVersion({ updated_at: event.updated_at, created_at: event.created_at ?? "" });
  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": versionedCacheControl(versioned),
      "X-Robots-Tag": "noindex",
    },
  });
}
