import type { Metadata } from "next";
import { inviteCardUrl } from "@/lib/app-url";
import { getEvent, getInviteeByToken } from "@/lib/db";
import { eventVersion, partyShareDescription, partyShareTitle } from "@/lib/party-share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const robots = { index: false, follow: false };
  const invitee = await getInviteeByToken(token);
  if (!invitee) return { robots };
  const event = await getEvent(invitee.event_id);
  if (!event) return { robots };
  const title = partyShareTitle(event);
  const description = partyShareDescription(event);
  const image = inviteCardUrl(token, eventVersion(event), "og");
  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
