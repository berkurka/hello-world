import { NotFoundView } from "@/app/components/not-found-view";
import { claimHostDashboard } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HostClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const value = String(token ?? "").trim();
  const event = value ? await claimHostDashboard(value) : null;
  if (event) {
    redirect(`/e/${event.id}/manage?t=${encodeURIComponent(event.admin_token)}`);
  }

  return (
    <NotFoundView
      title="This link has expired"
      body="Claim links work until they're opened, or for 7 days. If you saved your dashboard link, use that. You can also find your parties with the email you used to create them."
    />
  );
}
