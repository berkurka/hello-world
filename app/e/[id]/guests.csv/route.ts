import { listInvitees } from "@/lib/db";
import { guestsToCsv } from "@/lib/guest-list";
import { authorizeOrganizer } from "@/lib/host-login";
import { readHostCreds } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("t");
  const auth = await authorizeOrganizer(id, token, await readHostCreds());
  if (!auth) return new Response("Not found", { status: 404 });
  const invitees = await listInvitees(auth.event.id);
  const csv = guestsToCsv(invitees);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="partyz-guests.csv"',
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
