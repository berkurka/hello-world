"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatWhen, isEmail } from "@/lib/format";
import { fieldKeyFromMessage, inspectPartyImage, partyImagePath } from "@/lib/party-image";
import type { EventRow } from "@/lib/types";

export type EventDraft = {
  title?: string;
  location?: string;
  hostName?: string;
  hostEmail?: string;
  startsDate?: string;
  startsTime?: string;
  askComment?: boolean;
  askAdults?: boolean;
  askKids?: boolean;
  askInfants?: boolean;
};

const FIELD_IDS = {
  title: "event-title",
  startsDate: "event-date",
  startsTime: "event-time",
  hostName: "event-host-name",
  hostEmail: "event-host-email",
  partyImage: "event-party-image",
} as const;

type FieldKey = keyof typeof FIELD_IDS;

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

function scrollToIssue(fieldKey: FieldKey | "") {
  const field = fieldKey ? document.getElementById(FIELD_IDS[fieldKey]) : null;
  const flash = document.getElementById("event-form-error") ?? document.getElementById("form-error");
  const target = field ?? flash;
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.focus({ preventScroll: true });
  } else {
    flash?.focus();
  }
}

type ActionResult = void | { error?: string };

type Props = {
  event?: EventRow;
  draft?: EventDraft;
  initialError?: string;
  action: (formData: FormData) => ActionResult | Promise<ActionResult>;
  submitLabel: string;
  children?: React.ReactNode;
};

export function EventForm({ event, draft, initialError, action, submitLabel, children }: Props) {
  const initial = splitStarts(event, draft);
  const [title, setTitle] = useState(draft?.title ?? event?.title ?? "");
  const [location, setLocation] = useState(draft?.location ?? event?.location ?? "");
  const [hostName, setHostName] = useState(draft?.hostName ?? event?.host_name ?? "");
  const [hostEmail, setHostEmail] = useState(draft?.hostEmail ?? event?.host_email ?? "");
  const [startsDate, setStartsDate] = useState(initial.date);
  const [startsTime, setStartsTime] = useState(initial.time);
  const [askComment, setAskComment] = useState(
    draft?.askComment ?? (!event || event.ask_comment === 1),
  );
  const [askAdults, setAskAdults] = useState(draft?.askAdults ?? (!event || event.ask_adults === 1));
  const [askKids, setAskKids] = useState(draft?.askKids ?? event?.ask_kids === 1);
  const [askInfants, setAskInfants] = useState(draft?.askInfants ?? event?.ask_infants === 1);
  const [error, setError] = useState(initialError ?? "");
  const [invalidKey, setInvalidKey] = useState<FieldKey | "">(
    initialError ? fieldKeyFromMessage(initialError) : "",
  );
  const [scrollTick, setScrollTick] = useState(0);
  const isCreate = !event;
  const hasImage = Boolean(event?.party_image_mime);
  const valuesRef = useRef({
    title,
    location,
    hostName,
    hostEmail,
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
    hostEmail,
    startsDate,
    startsTime,
    askComment,
    askAdults,
    askKids,
    askInfants,
  };

  useEffect(() => {
    if (!error) return;
    scrollToIssue(invalidKey);
  }, [error, invalidKey, scrollTick]);

  function showIssue(message: string, key: FieldKey | "" = fieldKeyFromMessage(message)) {
    setInvalidKey(key);
    setError(message);
    setScrollTick((n) => n + 1);
  }

  async function submit(formData: FormData) {
    const v = valuesRef.current;
    const nextTitle = v.title.trim();
    const nextHost = v.hostName.trim();
    if (!nextTitle) {
      showIssue("Title is required.", "title");
      return;
    }
    if (!isDate(v.startsDate) || !isTime(v.startsTime)) {
      showIssue("Date and time are required.", "startsDate");
      return;
    }
    if (!nextHost) {
      showIssue("Host name is required.", "hostName");
      return;
    }
    if (isCreate) {
      const nextEmail = v.hostEmail.trim();
      if (!isEmail(nextEmail)) {
        showIssue("Host email is required.", "hostEmail");
        return;
      }
      formData.set("hostEmail", nextEmail.toLowerCase());
    }
    const file = formData.get("partyImage");
    if (file instanceof File && file.size > 0) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspected = inspectPartyImage(bytes, file.type, file.size);
      if (!inspected.ok) {
        showIssue(inspected.error, "partyImage");
        return;
      }
    }
    setError("");
    setInvalidKey("");
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
    if (result && result.error) showIssue(result.error);
  }

  return (
    <form action={submit} noValidate className="stack" style={{ marginTop: "1rem" }}>
      {children}
      <input type="hidden" name="startsDate" value={startsDate} />
      <input type="hidden" name="startsTime" value={startsTime} />
      {error ? (
        <p id="event-form-error" className="flash error" tabIndex={-1} role="alert">
          {error}
        </p>
      ) : null}
      <label className={invalidKey === "title" ? "field is-invalid" : "field"}>
        <span>Event title</span>
        <input
          id={FIELD_IDS.title}
          name="title"
          required
          value={title}
          aria-invalid={invalidKey === "title"}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Saturday dinner"
        />
      </label>
      <div className="counts">
        <label className={invalidKey === "startsDate" ? "field is-invalid" : "field"}>
          <span>Date (YYYY-MM-DD)</span>
          <input
            id={FIELD_IDS.startsDate}
            name="startsDate"
            type="date"
            required
            lang="en-CA"
            autoComplete="off"
            value={startsDate}
            aria-invalid={invalidKey === "startsDate"}
            onChange={(e) => {
              if (isDate(e.target.value)) setStartsDate(e.target.value);
            }}
            onInput={(e) => {
              if (isDate(e.currentTarget.value)) setStartsDate(e.currentTarget.value);
            }}
          />
        </label>
        <label className={invalidKey === "startsDate" ? "field is-invalid" : "field"}>
          <span>Time (HH:MM)</span>
          <input
            id={FIELD_IDS.startsTime}
            name="startsTime"
            type="time"
            required
            lang="en-CA"
            autoComplete="off"
            value={startsTime}
            aria-invalid={invalidKey === "startsDate"}
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
      <label className={invalidKey === "partyImage" ? "field is-invalid" : "field"}>
        <span>Party image (optional)</span>
        {hasImage && event ? (
          <img
            className="image-preview"
            src={partyImagePath(event.id)}
            alt="Current party image"
          />
        ) : null}
        <input
          id={FIELD_IDS.partyImage}
          name="partyImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          aria-invalid={invalidKey === "partyImage"}
        />
        <span className="hint">
          Shown on the invite card and as the RSVP page background. JPEG, PNG, WebP, or GIF. Max 1
          MB.
        </span>
      </label>
      {hasImage ? (
        <label className="check">
          <input name="removePartyImage" type="checkbox" />
          Remove the current party image
        </label>
      ) : null}
      <label className={invalidKey === "hostName" ? "field is-invalid" : "field"}>
        <span>Host name</span>
        <input
          id={FIELD_IDS.hostName}
          name="hostName"
          required
          value={hostName}
          aria-invalid={invalidKey === "hostName"}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="Alex"
        />
      </label>
      {isCreate ? (
        <label className={invalidKey === "hostEmail" ? "field is-invalid" : "field"}>
          <span>Host email</span>
          <input
            id={FIELD_IDS.hostEmail}
            name="hostEmail"
            type="email"
            required
            value={hostEmail}
            aria-invalid={invalidKey === "hostEmail"}
            onChange={(e) => setHostEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <span className="hint">We'll email a dashboard link. No password, no account.</span>
        </label>
      ) : null}
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
