import { partyImagePath } from "./party-image";

/**
 * Guest pages may render these fields and nothing else from an event row.
 * `allow_maybe` and `updated_at` are copied only when the row actually has them,
 * so a schema that has not added those columns stays valid.
 */
export const PUBLIC_EVENT_COLUMNS =
  "id, title, starts_at, ends_at, timezone, location, host_name, theme, party_image_mime, notes, ask_comment, ask_adults, ask_kids, ask_infants, created_at";

export const PUBLIC_EVENT_OPTIONAL_COLUMNS = ["allow_maybe", "updated_at"] as const;

export type PublicEventInput = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  timezone?: string | null;
  location?: string | null;
  host_name: string;
  theme?: string | null;
  party_image_mime?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
  created_at?: string | null;
  allow_maybe?: number | null;
  updated_at?: string | null;
};

export type PublicEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  location: string;
  host_name: string;
  theme: string;
  party_image_mime: string | null;
  photo_url: string | null;
  notes: string;
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
  created_at: string;
  allow_maybe?: number;
  updated_at?: string | null;
};

export type PublicInvitee = {
  display_name: string;
  family: boolean;
};

export type GuestInviteeInput = {
  display_name: string;
  token: string;
  email2?: string | null;
  family?: boolean | number;
};

export function toPublicEvent(event: PublicEventInput): PublicEvent {
  const photo_url =
    event.photo_url ?? (event.party_image_mime ? partyImagePath(event.id) : null);
  const pub: PublicEvent = {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    timezone: event.timezone ?? null,
    location: event.location ?? "",
    host_name: event.host_name,
    theme: event.theme || "classic",
    party_image_mime: event.party_image_mime ?? null,
    photo_url,
    notes: event.notes ?? "",
    ask_comment: event.ask_comment,
    ask_adults: event.ask_adults,
    ask_kids: event.ask_kids,
    ask_infants: event.ask_infants,
    created_at: event.created_at ?? "",
  };
  if ("allow_maybe" in event && event.allow_maybe != null) pub.allow_maybe = event.allow_maybe;
  if ("updated_at" in event) pub.updated_at = event.updated_at ?? null;
  return pub;
}

export function toPublicInvitee(invitee: {
  display_name: string;
  email2?: string | null;
  family?: boolean | number;
}): PublicInvitee {
  const family = Object.prototype.hasOwnProperty.call(invitee, "email2")
    ? Boolean(invitee.email2?.trim())
    : invitee.family === true || invitee.family === 1;
  return { display_name: invitee.display_name, family };
}

/** Fields the host editor reads. Dashboard tokens stay on the server. */
export type EditableEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  notes: string;
  host_name: string;
  host_email: string | null;
  timezone: string | null;
  theme: string;
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
  allow_maybe: number;
  party_image_mime: string | null;
};

export function toEditableEvent(event: {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  host_name: string;
  host_email?: string | null;
  timezone?: string | null;
  theme?: string | null;
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
  allow_maybe?: number | null;
  party_image_mime?: string | null;
}): EditableEvent {
  return {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    location: event.location ?? "",
    notes: event.notes ?? "",
    host_name: event.host_name,
    host_email: event.host_email ?? null,
    timezone: event.timezone ?? null,
    theme: event.theme || "classic",
    ask_comment: event.ask_comment,
    ask_adults: event.ask_adults,
    ask_kids: event.ask_kids,
    ask_infants: event.ask_infants,
    allow_maybe: event.allow_maybe ?? 0,
    party_image_mime: event.party_image_mime ?? null,
  };
}
