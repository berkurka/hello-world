import { formatWhen } from "@/lib/format";
import type { EventRow } from "@/lib/types";

type Props = {
  event?: EventRow;
};

export function EventFields({ event }: Props) {
  const startsAt = event?.starts_at ? event.starts_at.slice(0, 16) : "";
  const [startsDate, startsTime] = startsAt.includes("T")
    ? startsAt.split("T")
    : ["", ""];
  return (
    <>
      <label className="field">
        <span>Event title</span>
        <input name="title" required defaultValue={event?.title ?? ""} placeholder="Saturday dinner" />
      </label>
      <div className="counts">
        <label className="field">
          <span>Date</span>
          <input name="startsDate" type="date" required defaultValue={startsDate} />
        </label>
        <label className="field">
          <span>Time</span>
          <input name="startsTime" type="time" required defaultValue={startsTime} />
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
    </>
  );
}
