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
    <main className="wrap">
      <div className="card">
        <h1>Not found</h1>
        <p className="lede">
          That claim link is invalid or has expired. If you still have the dashboard URL from when
          the party was created, use that instead.
        </p>
      </div>
    </main>
  );
}
