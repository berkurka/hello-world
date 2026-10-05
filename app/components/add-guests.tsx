"use client";

import { useEffect, useState } from "react";
import { PasteInviteesForm } from "@/app/components/paste-invitees-form";
import { SubmitButton } from "@/app/components/ui/submit-button";

export function AddGuests({
  eventId,
  token,
  addInvitee,
  importInvitees,
  templateHref,
}: {
  eventId: string;
  token: string;
  addInvitee: (formData: FormData) => void | Promise<void>;
  importInvitees: (formData: FormData) => void | Promise<void>;
  templateHref: string;
}) {
  const [tab, setTab] = useState<"one" | "import">("one");

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#import-guests") setTab("import");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section className="card" id="add-guest">
      <h2>Add guests</h2>
      <div className="tabs" role="tablist" aria-label="How to add guests">
        <button
          className="btn ghost"
          type="button"
          role="tab"
          aria-selected={tab === "one"}
          onClick={() => setTab("one")}
        >
          Add one
        </button>
        <button
          className="btn ghost"
          type="button"
          role="tab"
          id="import-guests"
          aria-selected={tab === "import"}
          onClick={() => setTab("import")}
        >
          Import
        </button>
      </div>
      {tab === "one" ? (
        <form action={addInvitee} className="stack">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="t" value={token} />
          <label className="field">
            <span>Family or guest name</span>
            <input className="control" name="displayName" type="text" required placeholder="The Rivera family" />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="control" name="email" type="email" required placeholder="alex@example.com" />
          </label>
          <label className="field">
            <span>Second email</span>
            <input className="control" name="email2" type="email" placeholder="sam@example.com" />
            <span className="hint">Optional. Both addresses get the same RSVP link.</span>
          </label>
          <SubmitButton label="Add guest" pendingLabel="Adding…" />
        </form>
      ) : (
        <form action={importInvitees} className="stack">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="t" value={token} />
          <p className="hint">
            One row is one family: name, email, and an optional second email. Bad rows are skipped.
          </p>
          <p>
            <a className="btn ghost" href={templateHref} download>
              Download template
            </a>
          </p>
          <label className="field">
            <span>CSV file</span>
            <input className="control" name="csv" type="file" accept=".csv,text/csv,text/plain" required />
          </label>
          <SubmitButton label="Import CSV" pendingLabel="Importing…" />
        </form>
      )}
      {tab === "import" ? <PasteInviteesForm eventId={eventId} token={token} /> : null}
    </section>
  );
}
