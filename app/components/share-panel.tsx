import { CopyButton } from "@/app/components/copy-button";
import { SubmitButton } from "@/app/components/ui/submit-button";
import type { ReactNode } from "react";

export function SharePanel({
  eventId,
  token,
  canEmail,
  unsent,
  guestCount,
  sendAllUnsent,
  shareUrl,
  children,
}: {
  eventId: string;
  token: string;
  canEmail: boolean;
  unsent: number;
  guestCount: number;
  sendAllUnsent: (formData: FormData) => void | Promise<void>;
  /** Group invite URL. Hidden until the shareable-link work passes one. */
  shareUrl?: string | null;
  children?: ReactNode;
}) {
  return (
    <section className="card stack" id="share">
      <h2>Share</h2>
      {shareUrl ? (
        <div className="actions">
          <CopyButton text={shareUrl} label="Copy invite link" className="btn" />
        </div>
      ) : (
        <p className="hint">Each guest has their own link. Copy it from their card.</p>
      )}
      {canEmail && guestCount > 0 && unsent > 0 ? (
        <form action={sendAllUnsent}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="t" value={token} />
          <SubmitButton
            label={`Send to ${unsent} not yet invited`}
            pendingLabel="Sending…"
            className="block"
          />
        </form>
      ) : null}
      {!canEmail ? <p className="hint">Email sending isn&apos;t available. Copy a link to invite someone.</p> : null}
      {children}
    </section>
  );
}
