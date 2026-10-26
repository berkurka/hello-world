import { listInvitees } from "@/lib/db";
import { authorizeOrganizer } from "@/lib/host-login";
import { RSVP_EXPORT_FILENAME, exportRsvpsCsv } from "@/lib/invitee-csv";
import { readHostCreds } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const auth = await authorizeOrganizer(id, token?.trim() || null, await readHostCreds());
  if (!auth) return new Response("Not found", { status: 404 });
  const invitees = await listInvitees(auth.event.id);
  const csv = exportRsvpsCsv(
    invitees.map((row) => ({
      displayName: row.display_name,
      email: row.email,
      email2: row.email2,
      attending: row.attending,
      adults: row.adults,
      kids: row.kids,
      infants: row.infants,
      comment: row.comment,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${RSVP_EXPORT_FILENAME}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
