export function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function eventVersion(event: { updated_at?: string | null; created_at: string }) {
  return event.updated_at || event.created_at;
}

/** Versioned card URLs can be cached forever. Unversioned ones must not. */
export function versionedCacheControl(versioned: boolean) {
  return versioned ? "public, max-age=31536000, immutable" : "private, no-cache";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatShareWhen(startsAt: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(startsAt);
  if (!match) return oneLine(startsAt);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = match[5];
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${weekday}, ${MONTHS[month - 1]} ${day} · ${hour12}:${minute} ${ampm}`;
}

export function partyShareTitle(event: { host_name: string; title: string }) {
  const host = oneLine(event.host_name) || "Your host";
  const title = oneLine(event.title) || "a party";
  return `${host} invited you to ${title}`;
}

export function partyShareDescription(event: { starts_at: string; location: string }) {
  const when = formatShareWhen(event.starts_at);
  const place = oneLine(event.location.split("\n")[0] ?? "");
  const short = place.length > 80 ? `${place.slice(0, 79)}…` : place;
  return [when, short].filter(Boolean).join(" · ");
}
