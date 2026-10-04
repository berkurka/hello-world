"use client";

import { CopyButton } from "@/app/components/copy-button";
import { useWelcome } from "@/app/components/app-notices";

export function BackupLink({ url, hostEmail }: { url: string; hostEmail: string | null }) {
  const welcome = useWelcome();
  return (
    <details className="card" open={Boolean(welcome)}>
      <summary>Save a backup link</summary>
      <div className="stack" style={{ marginTop: "0.75rem" }}>
        <p className="hint">
          {hostEmail
            ? `We can email a link to ${hostEmail}. Keep this one too — it's how you open the dashboard from this device.`
            : "This link is how you get back to the dashboard."}
        </p>
        <p className="mono">{url}</p>
        <CopyButton text={url} label="Copy link" />
      </div>
    </details>
  );
}
