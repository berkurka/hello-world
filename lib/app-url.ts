export function getAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function rsvpUrl(token: string) {
  return `${getAppUrl()}/rsvp/${token}`;
}

export function shareUrl(token: string) {
  return `${getAppUrl()}/p/${token}`;
}

export function optOutUrl(token: string) {
  return `${getAppUrl()}/opt-out/${token}`;
}

export function manageUrl(eventId: string, adminToken: string) {
  return `${getAppUrl()}/e/${eventId}/manage?t=${adminToken}`;
}

export function hostClaimUrl(token: string) {
  return `${getAppUrl()}/host/claim?token=${encodeURIComponent(token)}`;
}

export function hostLoginUrl(token: string) {
  return `${getAppUrl()}/host/login?token=${encodeURIComponent(token)}`;
}

export function hostEmailChangeUrl(token: string) {
  return `${getAppUrl()}/host/email?token=${encodeURIComponent(token)}`;
}

export function inviteCardPath(token: string, version?: string | null, size?: "card" | "og") {
  const params = new URLSearchParams();
  if (size === "og") params.set("size", "og");
  if (version) params.set("v", version);
  const qs = params.toString();
  return `/api/invite-card/${token}${qs ? `?${qs}` : ""}`;
}

export function inviteCardUrl(token: string, version?: string | null, size?: "card" | "og") {
  return `${getAppUrl()}${inviteCardPath(token, version, size)}`;
}

export function icsPath(token: string) {
  return `/rsvp/${token}/event.ics`;
}

export function icsUrl(token: string) {
  return `${getAppUrl()}${icsPath(token)}`;
}
