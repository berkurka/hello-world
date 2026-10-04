export type Wall = { y: number; mo: number; d: number; hh: number; mm: number };

const WALL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export function isValidTimeZone(timeZone: string) {
  if (!timeZone || timeZone.length > 80) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function parseWall(value: string): Wall | null {
  const match = WALL.exec(value);
  if (!match) return null;
  const wall = {
    y: Number(match[1]),
    mo: Number(match[2]),
    d: Number(match[3]),
    hh: Number(match[4]),
    mm: Number(match[5]),
  };
  if (wall.mo < 1 || wall.mo > 12 || wall.d < 1 || wall.d > 31) return null;
  if (wall.hh > 23 || wall.mm > 59) return null;
  return wall;
}

export function formatIso(wall: Wall) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${wall.y}-${p(wall.mo)}-${p(wall.d)}T${p(wall.hh)}:${p(wall.mm)}`;
}

export function wallStamp(wall: Wall) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${wall.y}${p(wall.mo)}${p(wall.d)}T${p(wall.hh)}${p(wall.mm)}00`;
}

export function addMinutes(wall: Wall, minutes: number): Wall {
  const ms = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.hh, wall.mm) + minutes * 60_000;
  const date = new Date(ms);
  return {
    y: date.getUTCFullYear(),
    mo: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
    hh: date.getUTCHours(),
    mm: date.getUTCMinutes(),
  };
}

function wallMs(wall: Wall) {
  return Date.UTC(wall.y, wall.mo - 1, wall.d, wall.hh, wall.mm);
}

export function resolveEndsAt(startsAt: string, endsTime: string) {
  const start = parseWall(startsAt);
  if (!start || !/^\d{2}:\d{2}$/.test(endsTime)) return null;
  const [hh, mm] = endsTime.split(":").map(Number);
  let end: Wall = { ...start, hh, mm };
  if (wallMs(end) <= wallMs(start)) end = addMinutes(end, 24 * 60);
  return formatIso(end);
}

export function eventRange(event: { starts_at: string; ends_at: string | null }) {
  const start = parseWall(event.starts_at);
  if (!start) return null;
  let end = event.ends_at ? parseWall(event.ends_at) : null;
  if (!end) end = addMinutes(start, 3 * 60);
  if (wallMs(end) <= wallMs(start)) end = addMinutes(end, 24 * 60);
  return { start, end };
}

function readZoned(date: Date, timeZone: string): Wall {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    y: Number(parts.year),
    mo: Number(parts.month),
    d: Number(parts.day),
    hh: Number(parts.hour) % 24,
    mm: Number(parts.minute),
  };
}

/** Wall-clock time in an IANA zone, as a UTC instant. */
export function wallTimeToUtc(wall: Wall, timeZone: string) {
  if (!isValidTimeZone(timeZone)) return null;
  let utc = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.hh, wall.mm, 0);
  for (let i = 0; i < 3; i += 1) {
    const got = readZoned(new Date(utc), timeZone);
    utc += wallMs(wall) - wallMs(got);
  }
  return new Date(utc);
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string) {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let index = 73;
  while (index < line.length) {
    parts.push(` ${line.slice(index, index + 72)}`);
    index += 72;
  }
  return parts.join("\r\n");
}

function utcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(input: {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  location: string;
  description: string;
}) {
  const range = eventRange({ starts_at: input.startsAt, ends_at: input.endsAt });
  if (!range) return null;
  const zone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : null;
  const startLine = zone
    ? `DTSTART;TZID=${zone}:${wallStamp(range.start)}`
    : `DTSTART:${wallStamp(range.start)}`;
  const endLine = zone ? `DTEND;TZID=${zone}:${wallStamp(range.end)}` : `DTEND:${wallStamp(range.end)}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Partyz//Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(input.uid)}`,
    `DTSTAMP:${utcStamp()}`,
    startLine,
    endLine,
    `SUMMARY:${icsEscape(oneLineSafe(input.title))}`,
    `DESCRIPTION:${icsEscape(input.description)}`,
  ];
  const place = input.location.trim();
  if (place) lines.push(`LOCATION:${icsEscape(place)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

function oneLineSafe(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function googleCalendarUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  location: string;
  details: string;
}) {
  const range = eventRange({ starts_at: input.startsAt, ends_at: input.endsAt });
  if (!range) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: oneLineSafe(input.title),
    dates: `${wallStamp(range.start)}/${wallStamp(range.end)}`,
  });
  if (input.details) params.set("details", input.details);
  if (input.location.trim()) params.set("location", input.location.trim());
  if (input.timezone && isValidTimeZone(input.timezone)) params.set("ctz", input.timezone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  location: string;
  details: string;
}) {
  const range = eventRange({ starts_at: input.startsAt, ends_at: input.endsAt });
  if (!range) return null;
  const zone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : null;
  const start = zone ? wallTimeToUtc(range.start, zone) : null;
  const end = zone ? wallTimeToUtc(range.end, zone) : null;
  const startdt = start ? start.toISOString().replace(/\.\d{3}Z$/, "Z") : `${formatIso(range.start)}:00`;
  const enddt = end ? end.toISOString().replace(/\.\d{3}Z$/, "Z") : `${formatIso(range.end)}:00`;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: oneLineSafe(input.title),
    startdt,
    enddt,
  });
  if (input.details) params.set("body", input.details);
  if (input.location.trim()) params.set("location", input.location.trim());
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
