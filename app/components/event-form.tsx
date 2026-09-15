"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatWhen } from "@/lib/format";
import type { EventRow } from "@/lib/types";

function defaultEventDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function splitStarts(event?: EventRow) {
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

function firstNonEmpty(formData: FormData, key: string) {
  for (const value of formData.getAll(key)) {
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

type Props = {
  event?: EventRow;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  children?: React.ReactNode;
};

export function EventForm({ event, action, submitLabel, children }: Props) {
  const initial = splitStarts(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [hostName, setHostName] = useState(event?.host_name ?? "");
  const [startsDate, setStartsDate] = useState(initial.date);
  const [startsTime, setStartsTime] = useState(initial.time);
  const [error, setError] = useState("");
  const valuesRef = useRef({ title, location, hostName, startsDate, startsTime });
  valuesRef.current = { title, location, hostName, startsDate, startsTime };

  async function submit(formData: FormData) {
    const latest = valuesRef.current;
    const nextTitle = latest.title.trim() || firstNonEmpty(formData, "title");
    const nextLocation = latest.location.trim() || firstNonEmpty(formData, "location");
    const nextHost = latest.hostName.trim() || firstNonEmpty(formData, "hostName");
    const nextDate = isDate(latest.startsDate)
      ? latest.startsDate
      : firstNonEmpty(formData, "startsDate");
    const nextTime = isTime(latest.startsTime)
      ? latest.startsTime.slice(0, 5)
      : firstNonEmpty(formData, "startsTime").slice(0, 5);

    if (!nextTitle || !nextHost || !isDate(nextDate) || !isTime(nextTime)) {
      setError("Title, date (YYYY-MM-DD), time (HH:MM), and host name are required.");
      return;
    }

    formData.set("title", nextTitle);
    formData.set("location", nextLocation);
    formData.set("hostName", nextHost);
    formData.set("startsDate", nextDate);
    formData.set("startsTime", nextTime);
    await action(formData);
  }

  return (
    <form action={submit} noValidate className="stack" style={{ marginTop: "1rem" }}>
      {children}
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="hostName" value={hostName} />
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
          <input name="askComment" type="checkbox" defaultChecked={!event || event.ask_comment === 1} />
          Optional comment
        </label>
        <label className="check">
          <input name="askAdults" type="checkbox" defaultChecked={!event || event.ask_adults === 1} />
          Adults
        </label>
        <label className="check">
          <input name="askKids" type="checkbox" defaultChecked={event?.ask_kids === 1} />
          Kids
        </label>
        <label className="check">
          <input name="askInfants" type="checkbox" defaultChecked={event?.ask_infants === 1} />
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
