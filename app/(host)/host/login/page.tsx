import { consumeHostLogin } from "@/app/actions";
import { peekLoginToken } from "@/lib/host-login";

export const dynamic = "force-dynamic";

export default async function HostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const value = String(token ?? "").trim();
  const email = value && error !== "expired" ? await peekLoginToken(value) : null;
  const expired = error === "expired" || (value && !email);

  return (
    <main className="wrap">
      <div className="card stack">
        <div>
          <p className="kicker">Partyz</p>
          <h1>Sign in</h1>
        </div>
        {email ? (
          <>
            <p className="lede">Continue to the parties for {email}. This link works once.</p>
            <form action={consumeHostLogin}>
              <input type="hidden" name="token" value={value} />
              <button className="btn" type="submit">
                Continue
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="lede">
              {expired
                ? "This sign-in link is invalid or has expired."
                : "Open the sign-in link from your email."}
            </p>
            <p>
              <a className="btn" href="/host/recover">
                Find my parties
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
