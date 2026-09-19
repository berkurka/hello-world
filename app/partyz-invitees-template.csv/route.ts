import { INVITEE_CSV_FILENAME, inviteeCsvTemplate } from "@/lib/invitee-csv";

export function GET() {
  return new Response(inviteeCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${INVITEE_CSV_FILENAME}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
