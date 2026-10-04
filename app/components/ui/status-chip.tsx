import { rsvpStatusLabel, type RsvpStatus } from "@/lib/format";

export function StatusChip({ status, count }: { status: RsvpStatus; count?: number }) {
  return (
    <span className={`chip ${status}`}>
      {rsvpStatusLabel(status)}
      {count !== undefined ? <b>{count}</b> : null}
    </span>
  );
}
