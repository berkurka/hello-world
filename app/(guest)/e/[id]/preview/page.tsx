import { GuestInvite } from "@/app/components/guest-invite";
import { getEventForOrganizer } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();
  const event = await getEventForOrganizer(id, t);
  if (!event) notFound();
  return <GuestInvite event={event} guestName="Guest" rsvp={null} preview />;
}
