import { confirmHostEmail } from "@/app/actions";
import { peekEmailChange } from "@/lib/host-login";

export const dynamic = "force-dynamic";

export default async function HostEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const value = String(token ?? "").trim();
  const pending = value && error !== "expired" ? await peekEmailChange(value) : null;
  const expired = error === "expired" || (value && !pending);

  return (
    <main className="wrap">
      <div className="card stack">
        <div>
          <p className="kicker">Partyz</p>
          <h1>Confirm host email</h1>
        </div>
        {pending ? (
          <>
            <p className="lede">
              Use {pending.email} for {pending.title}. This link works once.
            </p>
            <form action={confirmHostEmail}>
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
                ? "This confirmation link is invalid or has expired."
                : "Open the confirmation link from your email."}
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
