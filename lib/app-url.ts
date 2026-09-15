export function getAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function rsvpUrl(token: string) {
  return `${getAppUrl()}/rsvp/${token}`;
}

export function manageUrl(eventId: string, adminToken: string) {
  return `${getAppUrl()}/e/${eventId}/manage?t=${adminToken}`;
}

export function inviteCardUrl(token: string) {
  return `${getAppUrl()}/api/invite-card/${token}`;
}
