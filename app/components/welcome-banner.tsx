"use client";

import { useWelcome } from "@/app/components/app-notices";

export function WelcomeBanner({ hostEmail }: { hostEmail: string | null }) {
  const welcome = useWelcome();
  if (!welcome) return null;
  const mail = welcome.mail;
  let title = "Party created";
  let body = "Save a backup link so you can get back to this page.";
  if (mail === "sent") {
    title = "Party created — check your email";
    body = hostEmail
      ? `We emailed a sign-in link to ${hostEmail}. It expires in 30 minutes. Save a backup link too.`
      : "We emailed a sign-in link. It expires in 30 minutes. Save a backup link too.";
  } else if (mail === "failed") {
    title = "Party created — email didn't send";
    body = "The party is ready. We couldn't send email, so save the backup link below.";
  } else if (mail === "skipped") {
    title = "Party created — save your dashboard link";
    body = "Email isn't available, so keep the backup link below.";
  }
  return (
    <div className={mail === "failed" ? "flash error" : "flash notice"} style={{ marginBottom: "1rem" }}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
