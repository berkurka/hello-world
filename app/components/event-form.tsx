"use client";

import { useState } from "react";
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

type Props = {
  event?: EventRow;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  children?: React.ReactNode;
};

export function EventForm({ event, action, submitLabel, children }: Props) {
  const initial = splitStarts(event);
  const [startsDate, setStartsDate] = useState(initial.date);
  const [startsTime, setStartsTime] = useState(initial.time);
  const [error, setError] = useState("");

  return (
    <form
      action={action}
      noValidate
      className="stack"
      style={{ marginTop: "1rem" }}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const dateInputs = [
          ...form.querySelectorAll<HTMLInputElement>('input[name="startsDate"]'),
        ];
        const timeInputs = [
          ...form.querySelectorAll<HTMLInputElement>('input[name="startsTime"]'),
        ];
        dateInputs.forEach((el) => {
          el.value = startsDate;
        });
        timeInputs.forEach((el) => {
          el.value = startsTime;
        });
        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(startsDate);
        const timeOk = /^\d{2}:\d{2}/.test(startsTime);
        if (!dateOk || !timeOk) {
          e.preventDefault();
          setError("Enter a date (YYYY-MM-DD) and time (HH:MM).");
        }
      }}
    >
      {children}
      <input type="hidden" name="startsDate" value={startsDate} />
      <input type="hidden" name="startsTime" value={startsTime} />
      {error ? <p className="flash error">{error}</p> : null}
      <label className="field">
        <span>Event title</span>
        <input name="title" required defaultValue={event?.title ?? ""} placeholder="Saturday dinner" />
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
            onChange={(e) => setStartsDate(e.target.value)}
            onInput={(e) => setStartsDate(e.currentTarget.value)}
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
            onChange={(e) => setStartsTime(e.target.value)}
            onInput={(e) => setStartsTime(e.currentTarget.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>Location or notes</span>
        <textarea
          name="location"
          rows={3}
          defaultValue={event?.location ?? ""}
          placeholder="123 Main St, or parking notes, dress code…"
        />
      </label>
      <label className="field">
        <span>Host name</span>
        <input name="hostName" required defaultValue={event?.host_name ?? ""} placeholder="Alex" />
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
      <button className="btn" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
