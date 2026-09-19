import { getEvent, getEventImage } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event?.party_image_mime) return new Response("Not found", { status: 404 });
  const image = await getEventImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=120",
    },
  });
}
