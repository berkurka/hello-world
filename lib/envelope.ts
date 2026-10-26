/**
 * The invite email attaches a still PNG: the card partly out of an envelope,
 * with the guest's name on the envelope. That image is the first frame Outlook
 * would show.
 *
 * An animated GIF (8–12 next/og frames, gifenc, cached per party and theme) is
 * skipped. Rendering those frames on the send path can exceed the serverless
 * time limit, and most clients only display frame one. The RSVP page plays the
 * open in CSS instead. The still PNG is the fallback that actually ships.
 */
export const ENVELOPE_GIF_ENABLED = false;

export const ENVELOPE_GIF_NOTE =
  "Animated GIF skipped: multi-frame invite renders on send are too slow. The still PNG is the email image, and the RSVP page animates the envelope in CSS.";

/** Fraction of the card that stays visible above the envelope on the still. */
export const ENVELOPE_STILL_REVEAL = 0.62;

export const ENVELOPE_WIDTH = 600;
export const ENVELOPE_HEIGHT = 780;

export function envelopeRsvpHref(rsvpLink: string) {
  try {
    const url = new URL(rsvpLink);
    url.searchParams.set("open", "1");
    return url.toString();
  } catch {
    const join = rsvpLink.includes("?") ? "&" : "?";
    return `${rsvpLink}${join}open=1`;
  }
}

export function envelopeCacheKey(input: { eventId: string; theme: string; version: string }) {
  return `${input.eventId}\0${input.theme}\0${input.version}`;
}
