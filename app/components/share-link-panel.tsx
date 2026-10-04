import { replaceShareLink, updateShareSettings } from "@/app/actions";
import { SubmitButton } from "@/app/components/ui/submit-button";

export function ShareLinkPanel({
  eventId,
  token,
  joined,
  enabled,
  shareToken,
  shareCap,
}: {
  eventId: string;
  token: string;
  joined: number;
  enabled: boolean;
  shareToken: string | null;
  shareCap: number | null;
}) {
  const live = enabled && Boolean(shareToken);

  return (
    <div className="stack">
      <p className="hint">
        One link for a group chat. Guests type their name and RSVP. Personal invite links keep working.
      </p>
      <form action={updateShareSettings} className="stack">
        <input type="hidden" name="eventId" value={eventId} />
        {token ? <input type="hidden" name="t" value={token} /> : null}
        <label className="switch">
          <input type="checkbox" name="shareEnabled" defaultChecked={enabled} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-copy">Anyone with this link can RSVP</span>
        </label>
        <label className="field">
          <span>Sign-up cap</span>
          <input
            className="control"
            type="number"
            name="shareCap"
            min={1}
            max={5000}
            defaultValue={shareCap ?? ""}
            placeholder="No cap"
          />
          <span className="hint">
            Optional. Limits how many people can join from this link
            {joined > 0 ? ` (${joined} joined so far)` : ""}. Leave blank for no cap.
          </span>
        </label>
        <SubmitButton label="Save party link" pendingLabel="Saving…" />
      </form>
      {live ? (
        <form action={replaceShareLink} className="stack">
          <input type="hidden" name="eventId" value={eventId} />
          {token ? <input type="hidden" name="t" value={token} /> : null}
          <label className="switch">
            <input type="checkbox" name="confirmReplace" required />
            <span className="switch-track" aria-hidden="true" />
            <span className="switch-copy">Replace the link. The old one stops working.</span>
          </label>
          <SubmitButton variant="ghost" label="Replace link" pendingLabel="Replacing…" />
        </form>
      ) : (
        <p className="hint">
          {enabled
            ? "Save to create the link."
            : "Sharing is off until you turn it on. Turning it back on starts a new link."}
        </p>
      )}
    </div>
  );
}
