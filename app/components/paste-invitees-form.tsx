import { pasteInvitees } from "@/app/actions";

export function PasteInviteesForm({ eventId, token }: { eventId: string; token: string }) {
  return (
    <form action={pasteInvitees} className="stack" style={{ marginTop: "0.85rem" }}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="t" value={token} />
      <label className="field">
        <span>Paste a list</span>
        <textarea
          className="control"
          name="list"
          rows={5}
          required
          placeholder={"The Rivera family, alex@example.com, sam@example.com\nSam Guest\tsam@example.com"}
        />
        <span className="hint">
          One guest per line. Name, email, and an optional second email, separated by commas, semicolons,
          or tabs. A header row is fine.
        </span>
      </label>
      <div className="actions">
        <button className="btn" type="submit">
          Add pasted guests
        </button>
      </div>
    </form>
  );
}
