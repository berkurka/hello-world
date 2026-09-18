export type EventRow = {
  id: string;
  admin_token: string;
  title: string;
  starts_at: string;
  location: string;
  host_name: string;
  host_email: string | null;
  host_claim_token: string | null;
  host_claimed_at: string | null;
  ask_comment: number;
  ask_adults: number;
  ask_kids: number;
  ask_infants: number;
  created_at: string;
};

export type InviteeRow = {
  id: string;
  event_id: string;
  email: string;
  display_name: string;
  token: string;
  invited_at: string | null;
  created_at: string;
};

export type RsvpRow = {
  id: string;
  invitee_id: string;
  attending: number;
  comment: string | null;
  adults: number;
  kids: number;
  infants: number;
  updated_at: string;
};

export type InviteeWithRsvp = InviteeRow & {
  attending: number | null;
  comment: string | null;
  adults: number | null;
  kids: number | null;
  infants: number | null;
  rsvp_updated_at: string | null;
};
