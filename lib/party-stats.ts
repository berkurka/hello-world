import { rsvpStatus, type RsvpStatus } from "./format";

type CountEvent = {
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
};

type CountReply = {
  attending: number | null;
  adults: number | null;
  kids: number | null;
  infants: number | null;
};

export function countsEnabled(event: CountEvent) {
  return Boolean(event.ask_adults || event.ask_kids || event.ask_infants);
}

export function headcount(event: CountEvent, row: CountReply) {
  if (row.attending !== 1) return 0;
  if (!countsEnabled(event)) return 1;
  return (
    (event.ask_adults ? (row.adults ?? 0) : 0) +
    (event.ask_kids ? (row.kids ?? 0) : 0) +
    (event.ask_infants ? (row.infants ?? 0) : 0)
  );
}

export function peopleComing(event: CountEvent, rows: CountReply[]) {
  return rows.reduce((sum, row) => sum + headcount(event, row), 0);
}

export function goingNeedsPeople(event: CountEvent, adults: number, kids: number, infants: number) {
  if (!countsEnabled(event)) return false;
  return adults + kids + infants < 1;
}

export function replyProgress(rows: { attending: number | null }[]) {
  const replied = rows.filter((row) => row.attending !== null && row.attending !== undefined).length;
  return { replied, total: rows.length };
}

export function statusCounts(rows: { attending: number | null }[]): Record<RsvpStatus, number> {
  const counts: Record<RsvpStatus, number> = { going: 0, maybe: 0, declined: 0, waiting: 0 };
  for (const row of rows) counts[rsvpStatus(row.attending)] += 1;
  return counts;
}
