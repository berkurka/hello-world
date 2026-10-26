import { formatShareWhen } from "./party-share";

/** Next Saturday at 2:00 PM, at least seven days out, as a wall-clock start. */
export function nextSamplePartyStart(now = new Date()) {
  const cursor = new Date(now.getTime());
  cursor.setHours(14, 0, 0, 0);
  if (cursor.getTime() <= now.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(14, 0, 0, 0);
  }
  const earliest = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() < earliest || cursor.getDay() !== 6) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(14, 0, 0, 0);
  }
  const y = cursor.getFullYear();
  const m = String(cursor.getMonth() + 1).padStart(2, "0");
  const d = String(cursor.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T14:00`;
}

export function formatSampleInviteWhen(startsAt: string) {
  return formatShareWhen(startsAt);
}
