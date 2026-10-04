import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar";
import { OpenInMaps } from "@/app/components/open-in-maps";

export function PartyActions({
  title,
  startsAt,
  endsAt,
  timezone,
  location,
  details,
  icsPath,
  showMaps = true,
}: {
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  location: string;
  details: string;
  icsPath: string;
  showMaps?: boolean;
}) {
  const input = { title, startsAt, endsAt, timezone, location, details };
  const google = googleCalendarUrl(input);
  const outlook = outlookCalendarUrl(input);
  return (
    <div className="party-actions">
      <p className="field">
        <span>Add to calendar</span>
      </p>
      <p className="actions">
        <a className="btn ghost small" href={icsPath}>
          Download .ics
        </a>
        {google ? (
          <a className="btn ghost small" href={google} target="_blank" rel="noreferrer">
            Google Calendar
          </a>
        ) : null}
        {outlook ? (
          <a className="btn ghost small" href={outlook} target="_blank" rel="noreferrer">
            Outlook
          </a>
        ) : null}
        {showMaps && location.trim() ? <OpenInMaps location={location} /> : null}
      </p>
    </div>
  );
}
