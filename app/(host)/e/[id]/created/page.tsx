import { getEventForOrganizer } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Old "party created" links. The dashboard welcome banner owns that copy now. */
export default async function PartyCreatedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; mail?: string }>;
}) {
  const { id } = await params;
  const { t, mail } = await searchParams;
  if (!t) notFound();
  const event = await getEventForOrganizer(id, t);
  if (!event) notFound();
  const query = new URLSearchParams({ t, welcome: "1" });
  query.set("mail", mail === "sent" || mail === "failed" || mail === "skipped" ? mail : "skipped");
  redirect(`/e/${event.id}/manage?${query.toString()}`);
}
