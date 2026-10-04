import { RecoverForm } from "@/app/components/recover-form";
import { RECOVER_SENT_MESSAGE, sessionEmailFromToken } from "@/lib/host-login";
import { mailConfigured } from "@/lib/mail";
import { readHostCreds } from "@/lib/request-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const mailOn = mailConfigured();
  if (sent !== "1") {
    const creds = await readHostCreds();
    const email = await sessionEmailFromToken(creds.sessionToken);
    if (email) redirect("/host");
  }

  return (
    <main className="wrap">
      <div className="card stack">
        <div>
          <p className="kicker">Partyz</p>
          <h1>Find my parties</h1>
        </div>
        {!mailOn ? (
          <p className="lede">
            Email isn&apos;t set up on this Partyz, so sign-in links can&apos;t be sent. Use the dashboard
            link you saved when you created the party.
          </p>
        ) : sent === "1" ? (
          <p className="flash notice">{RECOVER_SENT_MESSAGE}</p>
        ) : (
          <>
            <p className="lede">
              Enter the email you used as the host. If it has parties, we&apos;ll send a one-time sign-in
              link.
            </p>
            {error === "email" ? <p className="flash error">Enter a valid email.</p> : null}
            {error === "mail" ? (
              <p className="flash error">Email isn&apos;t set up, so sign-in links can&apos;t be sent.</p>
            ) : null}
            <RecoverForm />
          </>
        )}
        {mailOn && sent === "1" ? (
          <p>
            <a href="/host/recover">Use a different email</a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
