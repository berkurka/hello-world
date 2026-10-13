"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CopyButton, ShareLinkButton, textInviteHref } from "@/app/components/copy-button";
import { Avatar } from "@/app/components/ui/avatar";
import { StatusChip } from "@/app/components/ui/status-chip";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { rsvpStatusLabel, type RsvpStatus } from "@/lib/format";

export type GuestCardModel = {
  id: string;
  name: string;
  email: string;
  email2: string | null;
  status: RsvpStatus;
  counts: string;
  comment: string;
  invited: string;
  url: string;
  detail?: string;
  manage?: ReactNode;
};

const FILTERS: RsvpStatus[] = ["going", "maybe", "declined", "waiting"];

export function GuestList({
  guests,
  partyTitle,
  eventId,
  token,
  canEmail,
  sendInvite,
  showNotes,
  exportHref,
}: {
  guests: GuestCardModel[];
  partyTitle: string;
  eventId: string;
  token: string;
  canEmail: boolean;
  sendInvite: (formData: FormData) => void | Promise<void>;
  showNotes: boolean;
  exportHref?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RsvpStatus>("all");
  const available = FILTERS.filter((status) => guests.some((guest) => guest.status === status));
  const counts = useMemo(() => {
    const tally: Record<"all" | RsvpStatus, number> = {
      all: guests.length,
      going: 0,
      maybe: 0,
      declined: 0,
      waiting: 0,
    };
    for (const guest of guests) tally[guest.status] += 1;
    return tally;
  }, [guests]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((guest) => {
      if (filter !== "all" && guest.status !== filter) return false;
      if (!q) return true;
      return (
        guest.name.toLowerCase().includes(q) ||
        guest.email.toLowerCase().includes(q) ||
        (guest.email2 ?? "").toLowerCase().includes(q)
      );
    });
  }, [guests, query, filter]);

  return (
    <section className="card stack" aria-label="Guest list">
      <div className="section-head">
        <h2>Guests</h2>
        {exportHref ? (
          <a className="btn ghost" href={exportHref}>
            Export CSV
          </a>
        ) : null}
      </div>
      <label className="field">
        <span className="sr-only">Search guests</span>
        <input
          className="control"
          type="search"
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="filters segmented" role="tablist" aria-label="Filter by reply">
        <FilterButton current={filter} value="all" count={counts.all} onClick={setFilter}>
          All
        </FilterButton>
        {available.map((status) => (
          <FilterButton key={status} current={filter} value={status} count={counts[status]} onClick={setFilter}>
            {rsvpStatusLabel(status)}
          </FilterButton>
        ))}
      </div>
      {shown.length === 0 ? <p className="hint">No guests match.</p> : null}
      <div className="guest-cards">
        {shown.map((guest) => (
          <article key={guest.id} className="guest-card stack">
            <div className="guest-card-head">
              <Avatar name={guest.name} />
              <div className="who">
                <strong>{guest.name}</strong>
                <p className="email">{guest.email}</p>
                {guest.email2 ? <p className="email">{guest.email2}</p> : null}
              </div>
              <StatusChip status={guest.status} />
            </div>
            {guest.detail ? <p className="hint">{guest.detail}</p> : null}
            {guest.counts ? <p>{guest.counts}</p> : null}
            {showNotes && guest.comment ? <p>{guest.comment}</p> : null}
            <InviteStatus invited={guest.invited} />
            <GuestActions
              guest={guest}
              partyTitle={partyTitle}
              eventId={eventId}
              token={token}
              canEmail={canEmail}
              sendInvite={sendInvite}
            />
            {guest.manage}
          </article>
        ))}
      </div>
      <div className="guest-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Reply</th>
              <th scope="col">Party</th>
              {showNotes ? <th scope="col">Note</th> : null}
              <th scope="col">Invite</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((guest) => (
              <tr key={guest.id}>
                <td>{guest.name}</td>
                <td>
                  {guest.email}
                  {guest.email2 ? (
                    <>
                      <br />
                      {guest.email2}
                    </>
                  ) : null}
                </td>
                <td>
                  <StatusChip status={guest.status} />
                  {guest.detail ? <p className="hint">{guest.detail}</p> : null}
                </td>
                <td>{guest.counts}</td>
                {showNotes ? <td>{guest.comment}</td> : null}
                <td>
                  <InviteStatus invited={guest.invited} />
                </td>
                <td>
                  <GuestActions
                    guest={guest}
                    partyTitle={partyTitle}
                    eventId={eventId}
                    token={token}
                    canEmail={canEmail}
                    sendInvite={sendInvite}
                  />
                  {guest.manage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterButton({
  current,
  value,
  count,
  onClick,
  children,
}: {
  current: string;
  value: "all" | RsvpStatus;
  count: number;
  onClick: (value: "all" | RsvpStatus) => void;
  children: React.ReactNode;
}) {
  const on = current === value;
  return (
    <button type="button" role="tab" aria-selected={on} onClick={() => onClick(value)}>
      {children}
      <span className="filter-count">{count}</span>
    </button>
  );
}

function InviteStatus({ invited }: { invited: string }) {
  if (invited === "Not sent") return <span className="chip waiting">Not sent</span>;
  return <span className="hint">{invited}</span>;
}

function GuestActions({
  guest,
  partyTitle,
  eventId,
  token,
  canEmail,
  sendInvite,
}: {
  guest: GuestCardModel;
  partyTitle: string;
  eventId: string;
  token: string;
  canEmail: boolean;
  sendInvite: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="actions">
      <CopyButton text={guest.url} label="Copy link" className="btn" />
      <a className="btn ghost sms-link" href={textInviteHref(partyTitle, guest.url)}>
        <SmsIcon />
        Text link
      </a>
      <ShareLinkButton
        title={partyTitle}
        url={guest.url}
        text={`${guest.name}, you're invited to ${partyTitle}.`}
      />
      {canEmail ? (
        <form action={sendInvite}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="t" value={token} />
          <input type="hidden" name="inviteeId" value={guest.id} />
          <SubmitButton
            variant="ghost"
            label={guest.invited === "Not sent" ? "Send email" : "Resend email"}
            pendingLabel="Sending…"
          />
        </form>
      ) : null}
    </div>
  );
}

function SmsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z" />
    </svg>
  );
}
