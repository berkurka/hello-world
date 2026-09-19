import type { EventRow } from "./types";

/** Unclaimed host tokens expire this long after the event is created. */
export const HOST_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function claimTokenIsOpen(event: EventRow) {
  if (!event.host_claim_token) return false;
  if (event.host_claimed_at) return true;
  const created = Date.parse(event.created_at);
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= HOST_CLAIM_TTL_MS;
}
