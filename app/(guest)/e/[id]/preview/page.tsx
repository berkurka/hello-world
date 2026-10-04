import { GuestInvite } from "@/app/components/guest-invite";
import { authorizeOrganizer } from "@/lib/host-login";
import { readHostCreds } from "@/lib/request-auth";
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
  const auth = await authorizeOrganizer(id, t?.trim() || null, await readHostCreds());
  if (!auth) notFound();
  return <GuestInvite event={auth.event} guestName="Guest" rsvp={null} preview />;
}
