"use client";

import { useEffect, useRef, useState } from "react";
import { InviteCardView } from "@/app/components/invite-card-view";
import { RsvpChoice } from "@/app/components/ui/rsvp-choice";
import { SubmitButton } from "@/app/components/ui/submit-button";
import { Switch } from "@/app/components/ui/switch";
import { BABY_LABEL, formatInviteWhen, isEmail } from "@/lib/format";
import { fieldKeyFromMessage, inspectPartyImage, partyImagePath } from "@/lib/party-image";
import type { EditableEvent } from "@/lib/public-event";
import { THEME_LIST, themeById, type ThemeId } from "@/lib/themes";

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
type ActionResult = void | { error?: string };

type Props = {
  event?: EditableEvent;
  draft?: EventDraft;
  initialError?: string;
  action: (formData: FormData) => ActionResult | Promise<ActionResult>;
  submitLabel: string;
  showPreview?: boolean;
  children?: React.ReactNode;
  beforeSubmit?: React.ReactNode;
};

function defaultEventDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function splitStarts(event?: EditableEvent, draft?: EventDraft) {
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

function splitEnd(event?: EditableEvent) {
  const raw = event?.ends_at ? event.ends_at.slice(0, 16) : "";
  if (raw.includes("T")) return raw.split("T")[1]?.slice(0, 5) ?? "";
  return "";
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

export function EventForm({
  event,
  draft,
  initialError,
  action,
  submitLabel,
  showPreview = true,
  children,
  beforeSubmit,
}: Props) {
  const initial = splitStarts(event, draft);
  const isCreate = !event;
  const [title, setTitle] = useState(draft?.title ?? event?.title ?? "");
  const [location, setLocation] = useState(draft?.location ?? event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [hostName, setHostName] = useState(draft?.hostName ?? event?.host_name ?? "");
  const [hostEmail, setHostEmail] = useState(draft?.hostEmail ?? event?.host_email ?? "");
  const [startsDate, setStartsDate] = useState(initial.date);
  const [startsTime, setStartsTime] = useState(initial.time);
  const [endsTime, setEndsTime] = useState(splitEnd(event));
  const [timezone, setTimezone] = useState(event?.timezone ?? "");
  const [theme, setTheme] = useState<ThemeId>(themeById(event?.theme).id);
  const [askComment, setAskComment] = useState(draft?.askComment ?? (!event || event.ask_comment === 1));
  const [askAdults, setAskAdults] = useState(draft?.askAdults ?? (!event || event.ask_adults === 1));
  const [askKids, setAskKids] = useState(draft?.askKids ?? event?.ask_kids === 1);
  const [askInfants, setAskInfants] = useState(draft?.askInfants ?? event?.ask_infants === 1);
  const [allowMaybe, setAllowMaybe] = useState(event ? event.allow_maybe !== 0 : true);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(event));
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [parkSubmit, setParkSubmit] = useState(isCreate);
  const [error, setError] = useState(initialError ?? "");
  const [invalidKey, setInvalidKey] = useState<FieldKey | "">(
    initialError ? fieldKeyFromMessage(initialError) : "",
  );
  const [scrollTick, setScrollTick] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(event ? partyImagePath(event.id) : null);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [removePhoto, setRemovePhoto] = useState(false);
  const hasImage = Boolean(event?.party_image_mime);
  const valuesRef = useRef({
    title,
    location,
    notes,
    hostName,
    hostEmail,
    startsDate,
    startsTime,
    endsTime,
    timezone,
    theme,
    askComment,
    askAdults,
    askKids,
    askInfants,
    allowMaybe,
  });
  valuesRef.current = {
    title,
    location,
    notes,
    hostName,
    hostEmail,
    startsDate,
    startsTime,
    endsTime,
    timezone,
    theme,
    askComment,
    askAdults,
    askKids,
    askInfants,
    allowMaybe,
  };

  useEffect(() => {
    if (timezone) return;
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTimezone("");
    }
  }, [timezone]);

  useEffect(() => {
    if (!error) return;
    setTab("edit");
    scrollToIssue(invalidKey);
  }, [error, invalidKey, scrollTick]);

  useEffect(() => {
    if (!isCreate) return;
    const hero = document.getElementById("hero-create");
    if (!hero) {
      setParkSubmit(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setParkSubmit(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [isCreate]);

  useEffect(() => {
    const scrollToCreate = () => {
      if (window.location.hash !== "#create") return;
      document.getElementById("create")?.scrollIntoView({ block: "start" });
    };
    scrollToCreate();
    window.addEventListener("hashchange", scrollToCreate);
    return () => window.removeEventListener("hashchange", scrollToCreate);
  }, []);

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
    if (v.endsTime && (!isTime(v.endsTime) || `${v.startsDate}T${v.endsTime.slice(0, 5)}` <= `${v.startsDate}T${v.startsTime}`)) {
      showIssue("End time must be after the start time.", "startsDate");
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
    formData.set("notes", v.notes);
    formData.set("hostName", nextHost);
    formData.set("startsDate", v.startsDate);
    formData.set("startsTime", v.startsTime);
    formData.set("endsTime", v.endsTime);
    formData.set("timezone", v.timezone);
    formData.set("theme", v.theme);
    if (v.askComment) formData.set("askComment", "on");
    else formData.delete("askComment");
    if (v.askAdults) formData.set("askAdults", "on");
    else formData.delete("askAdults");
    if (v.askKids) formData.set("askKids", "on");
    else formData.delete("askKids");
    if (v.askInfants) formData.set("askInfants", "on");
    else formData.delete("askInfants");
    if (v.allowMaybe) formData.set("allowMaybe", "on");
    else formData.delete("allowMaybe");
    const result = await action(formData);
    if (result && result.error) showIssue(result.error);
  }

  function onPhoto(file: File | null) {
    if (!file || file.size === 0) return;
    setRemovePhoto(false);
    setPhotoBroken(false);
    const url = URL.createObjectURL(file);
    setPhotoUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return url;
    });
  }

  const previewWhen =
    isDate(startsDate) && isTime(startsTime)
      ? formatInviteWhen(
          `${startsDate}T${startsTime.slice(0, 5)}`,
          endsTime && isTime(endsTime) ? `${startsDate}T${endsTime.slice(0, 5)}` : null,
        )
      : "Date and time";
  const previewImage = removePhoto || photoBroken ? null : photoUrl;

  return (
    <form action={submit} noValidate>
      {children}
      {error ? (
        <p id="event-form-error" className="flash error" tabIndex={-1} role="alert">
          {error}
        </p>
      ) : null}
      <div className={`${tab === "preview" ? "composer show-preview" : "composer"}${isCreate ? " composer-create" : ""}`}>
        {showPreview ? (
          <div className="composer-tabs segmented" role="tablist" aria-label="Create or preview">
            <button
              type="button"
              role="tab"
              id="create-tab-details"
              aria-selected={tab === "edit"}
              aria-controls="create-panel-details"
              onClick={() => setTab("edit")}
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              id="create-tab-preview"
              aria-selected={tab === "preview"}
              aria-controls="create-panel-preview"
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
          </div>
        ) : null}
        <div className="composer-form stack" id="create-panel-details" role={showPreview ? "tabpanel" : undefined} aria-labelledby={showPreview ? "create-tab-details" : undefined}>
          <label className={invalidKey === "title" ? "field is-invalid" : "field"}>
            <span>Party title</span>
            <input
              className="control"
              id={FIELD_IDS.title}
              name="title"
              type="text"
              required
              value={title}
              aria-invalid={invalidKey === "title"}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Maya's 7th birthday"
            />
          </label>
          <div className="counts">
            <label className={invalidKey === "startsDate" ? "field is-invalid" : "field"}>
              <span>Date</span>
              <input
                className="control"
                id={FIELD_IDS.startsDate}
                type="date"
                required
                autoComplete="off"
                value={startsDate}
                aria-invalid={invalidKey === "startsDate"}
                onChange={(e) => {
                  if (isDate(e.target.value)) setStartsDate(e.target.value);
                }}
              />
            </label>
            <label className={invalidKey === "startsDate" ? "field is-invalid" : "field"}>
              <span>Start time</span>
              <input
                className="control"
                id={FIELD_IDS.startsTime}
                type="time"
                required
                autoComplete="off"
                value={startsTime}
                aria-invalid={invalidKey === "startsDate"}
                onChange={(e) => {
                  if (isTime(e.target.value)) setStartsTime(e.target.value.slice(0, 5));
                }}
              />
            </label>
          </div>
          <label className="field">
            <span>End time (optional)</span>
            <input
              className="control"
              type="time"
              autoComplete="off"
              value={endsTime}
              onChange={(e) => setEndsTime(e.target.value.slice(0, 5))}
            />
          </label>
          <label className={invalidKey === "hostName" ? "field is-invalid" : "field"}>
            <span>Your name</span>
            <input
              className="control"
              id={FIELD_IDS.hostName}
              name="hostName"
              type="text"
              required
              value={hostName}
              aria-invalid={invalidKey === "hostName"}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Bernardo"
            />
          </label>
          {isCreate ? (
            <label className={invalidKey === "hostEmail" ? "field is-invalid" : "field"}>
              <span>Your email</span>
              <input
                className="control"
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
              <span className="hint">We&apos;ll email a link to your dashboard. No password.</span>
            </label>
          ) : null}
          <input type="hidden" name="timezone" value={timezone} />
          <button
            className="btn ghost"
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? "Hide extra details" : "Add details"}
          </button>
          <div className="stack" hidden={!detailsOpen}>
              <label className="field">
                <span>Place</span>
                <input
                  className="control"
                  name="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Riverside Park"
                />
              </label>
              <label className="field">
                <span>Notes for guests</span>
                <textarea
                  className="control"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What to bring, parking, dress code…"
                />
              </label>
              <div className={invalidKey === "partyImage" ? "field is-invalid" : "field"}>
                <span>Cover photo</span>
                <div className={invalidKey === "partyImage" ? "drop is-invalid" : "drop"}>
                  {previewImage ? (
                    <img src={previewImage} alt="" onError={() => setPhotoBroken(true)} />
                  ) : (
                    <span className="hint">Drop a photo, or tap to choose. JPEG, PNG, WebP, or GIF. Max 1 MB.</span>
                  )}
                  <input
                    id={FIELD_IDS.partyImage}
                    name="partyImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                    aria-label="Cover photo"
                    aria-invalid={invalidKey === "partyImage"}
                    onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              {hasImage ? (
                <label className="switch">
                  <input
                    name="removePartyImage"
                    type="checkbox"
                    checked={removePhoto}
                    onChange={(e) => setRemovePhoto(e.target.checked)}
                  />
                  <span className="switch-track" aria-hidden="true" />
                  <span>Remove the current photo</span>
                </label>
              ) : null}
              <div className="field">
                <span>Theme</span>
                <div className="theme-grid" role="radiogroup" aria-label="Invite theme">
                  {THEME_LIST.map((item) => (
                    <label key={item.id} className={theme === item.id ? "theme-pick on" : "theme-pick"}>
                      <input
                        type="radio"
                        name="theme"
                        value={item.id}
                        checked={theme === item.id}
                        onChange={() => setTheme(item.id)}
                      />
                      <span
                        className="theme-swatch"
                        style={{ background: `linear-gradient(135deg, ${item.frame}, ${item.accent})` }}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <fieldset className="stack">
                <legend>What should guests tell you?</legend>
                <p className="hint">Going and can&apos;t go are always shown.</p>
                <Switch name="allowMaybe" label="Maybe" checked={allowMaybe} onChange={setAllowMaybe} />
                <Switch name="askComment" label="A note" checked={askComment} onChange={setAskComment} />
                <Switch name="askAdults" label="Adults" checked={askAdults} onChange={setAskAdults} />
                <Switch name="askKids" label="Kids" checked={askKids} onChange={setAskKids} />
                <Switch name="askInfants" label={BABY_LABEL} checked={askInfants} onChange={setAskInfants} />
              </fieldset>
          </div>
          {beforeSubmit}
          <div className={parkSubmit ? "sticky-submit is-parked" : "sticky-submit"}>
            <SubmitButton className="block" label={submitLabel} pendingLabel="Saving…" />
          </div>
        </div>
        {showPreview ? (
          <aside className="composer-preview stack" id="create-panel-preview" role="tabpanel" aria-labelledby="create-tab-preview" aria-label="Invite preview">
            <InviteCardView
              theme={theme}
              title={title.trim() || "Your party"}
              guestName="Priya"
              when={previewWhen}
              place={location}
              hostName={hostName.trim() || "You"}
              imageSrc={previewImage}
            />
            <div className="card stack">
              <p className="hint">What guests see when they answer</p>
              <RsvpChoice readOnly />
            </div>
          </aside>
        ) : null}
      </div>
    </form>
  );
}
