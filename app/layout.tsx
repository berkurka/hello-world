import type { Metadata } from "next";
import Link from "next/link";
import { HostNav } from "@/app/components/host-nav";
import { isEphemeralDb } from "@/lib/db-env";
import { sessionEmailFromToken } from "@/lib/host-login";
import { mailConfigured } from "@/lib/mail";
import { readHostCreds } from "@/lib/request-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Partyz",
  description: "Plan and organize your party here in 3 steps.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ephemeral = isEphemeralDb();
  const creds = await readHostCreds();
  const signedIn = Boolean(await sessionEmailFromToken(creds.sessionToken));
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/">Partyz</Link>
          <HostNav mailOn={mailConfigured()} signedIn={signedIn} />
        </header>
        {ephemeral ? (
          <p className="warn banner">
            Preview data is stored in a temporary file and can disappear between requests. Set{" "}
            <code>TURSO_DATABASE_URL</code> (and <code>TURSO_AUTH_TOKEN</code>) for production so
            events and RSVPs persist.
          </p>
        ) : null}
        {children}
      </body>
    </html>
  );
}
