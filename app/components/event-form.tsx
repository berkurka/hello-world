"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatWhen } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export type EventDraft = {
  title?: string;
  location?: string;
  hostName?: string;
  startsDate?: string;
  startsTime?: string;
  askComment?: boolean;
  askAdults?: boolean;
  askKids?: boolean;
  askInfants?: boolean;
};

function defaultEventDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function splitStarts(event?: EventRow, draft?: EventDraft) {
  if (draft?.startsDate && draft?.startsTime) {
    return { date: draft.startsDate, time: draft.startsTime.slice(0, 5) };
  }
  const raw = event?.starts_at ? event.starts_at.slice(0, 16) : "";
  if (raw.includes("T")) {
    const [date, time] = raw.split("T");
    return { date, time: time.slice(0, 5) };
  }
  return { date: defaultEventDate(), time: "18:00" };
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string) {
  return /^\d{2}:\d{2}/.test(value);
}

type ActionResult = void | { error?: string };

type Props = {
  event?: EventRow;
  draft?: EventDraft;
  action: (formData: FormData) => ActionResult | Promise<ActionResult>;
  submitLabel: string;
  children?: React.ReactNode;
};

export function EventForm({ event, draft, action, submitLabel, children }: Props) {
  const initial = splitStarts(event, draft);
  const [title, setTitle] = useState(draft?.title ?? event?.title ?? "");
  const [location, setLocation] = useState(draft?.location ?? event?.location ?? "");
  const [hostName, setHostName] = useState(draft?.hostName ?? event?.host_name ?? "");
  const [startsDate, setStartsDate] = useState(initial.date);
  const [startsTime, setStartsTime] = useState(initial.time);
  const [askComment, setAskComment] = useState(
    draft?.askComment ?? (!event || event.ask_comment === 1),
  );
  const [askAdults, setAskAdults] = useState(draft?.askAdults ?? (!event || event.ask_adults === 1));
  const [askKids, setAskKids] = useState(draft?.askKids ?? event?.ask_kids === 1);
  const [askInfants, setAskInfants] = useState(draft?.askInfants ?? event?.ask_infants === 1);
  const [error, setError] = useState("");
  const valuesRef = useRef({
    title,
    location,
    hostName,
    startsDate,
    startsTime,
    askComment,
    askAdults,
    askKids,
    askInfants,
  });
  valuesRef.current = {
    title,
    location,
    hostName,
    startsDate,
    startsTime,
    askComment,
    askAdults,
    askKids,
    askInfants,
  };

  async function submit(formData: FormData) {
    const v = valuesRef.current;
    const nextTitle = v.title.trim();
    const nextHost = v.hostName.trim();
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }
    if (!isDate(v.startsDate) || !isTime(v.startsTime)) {
      setError("Date and time are required.");
      return;
    }
    if (!nextHost) {
      setError("Host name is required.");
      return;
    }
    setError("");
    formData.set("title", nextTitle);
    formData.set("location", v.location);
    formData.set("hostName", nextHost);
    formData.set("startsDate", v.startsDate);
    formData.set("startsTime", v.startsTime);
    if (v.askComment) formData.set("askComment", "on");
    else formData.delete("askComment");
    if (v.askAdults) formData.set("askAdults", "on");
    else formData.delete("askAdults");
    if (v.askKids) formData.set("askKids", "on");
    else formData.delete("askKids");
    if (v.askInfants) formData.set("askInfants", "on");
    else formData.delete("askInfants");
    const result = await action(formData);
    if (result && result.error) setError(result.error);
  }

  return (
    <form action={submit} noValidate className="stack" style={{ marginTop: "1rem" }}>
      {children}
      <input type="hidden" name="startsDate" value={startsDate} />
      <input type="hidden" name="startsTime" value={startsTime} />
      {error ? <p className="flash error">{error}</p> : null}
      <label className="field">
        <span>Event title</span>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Saturday dinner"
        />
      </label>
      <div className="counts">
        <label className="field">
          <span>Date (YYYY-MM-DD)</span>
          <input
            name="startsDate"
            type="date"
            required
            lang="en-CA"
            autoComplete="off"
            value={startsDate}
            onChange={(e) => {
              if (isDate(e.target.value)) setStartsDate(e.target.value);
            }}
            onInput={(e) => {
              if (isDate(e.currentTarget.value)) setStartsDate(e.currentTarget.value);
            }}
          />
        </label>
        <label className="field">
          <span>Time (HH:MM)</span>
          <input
            name="startsTime"
            type="time"
            required
            lang="en-CA"
            autoComplete="off"
            value={startsTime}
            onChange={(e) => {
              if (isTime(e.target.value)) setStartsTime(e.target.value.slice(0, 5));
            }}
            onInput={(e) => {
              if (isTime(e.currentTarget.value)) setStartsTime(e.currentTarget.value.slice(0, 5));
            }}
          />
        </label>
      </div>
      <label className="field">
        <span>Location or notes</span>
        <textarea
          name="location"
          rows={3}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="123 Main St, or parking notes, dress code…"
        />
      </label>
      <label className="field">
        <span>Host name</span>
        <input
          name="hostName"
          required
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="Alex"
        />
      </label>
      <fieldset className="toggles">
        <legend>RSVP fields for invitees</legend>
        <p className="hint">Yes / no is always shown. Turn on anything else you want to collect.</p>
        <label className="check">
          <input
            name="askComment"
            type="checkbox"
            checked={askComment}
            onChange={(e) => setAskComment(e.target.checked)}
          />
          Optional comment
        </label>
        <label className="check">
          <input
            name="askAdults"
            type="checkbox"
            checked={askAdults}
            onChange={(e) => setAskAdults(e.target.checked)}
          />
          Adults
        </label>
        <label className="check">
          <input
            name="askKids"
            type="checkbox"
            checked={askKids}
            onChange={(e) => setAskKids(e.target.checked)}
          />
          Kids
        </label>
        <label className="check">
          <input
            name="askInfants"
            type="checkbox"
            checked={askInfants}
            onChange={(e) => setAskInfants(e.target.checked)}
          />
          Kids under 12 months
        </label>
      </fieldset>
      {event ? <p className="hint">Preview: {formatWhen(event.starts_at)}</p> : null}
      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}
