import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invite",
  description: "Create an event, send invites, collect RSVPs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/">Invite</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
