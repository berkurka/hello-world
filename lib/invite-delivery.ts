export type InviteDelivery = {
  sent: string[];
  failed: string[];
  error?: string;
};

export function appendSendError(text: string, error?: string) {
  const detail = error?.replace(/\s+/g, " ").trim();
  if (detail) console.error("Mail provider error:", detail);
  return text;
}

const PUBLIC_MAIL_ERRORS = new Set([
  "Email sending isn't available right now.",
  "Invitee has no email address.",
]);

/** User-facing send failure. Provider text is logged, not returned. */
export function friendlyMailError(err: unknown) {
  const message = err instanceof Error ? err.message.trim() : "";
  if (PUBLIC_MAIL_ERRORS.has(message)) return message;
  console.error("Mail provider error:", err);
  return "Could not send that email. Copy the link to share it instead.";
}

export function isFamilyInvite(invitee: { email2?: string | null }) {
  return Boolean(invitee.email2?.trim());
}

export function inviteRecipients(invitee: { email: string; email2?: string | null }) {
  const recipients: string[] = [];
  for (const value of [invitee.email, invitee.email2]) {
    const email = (value ?? "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (recipients.some((existing) => existing.toLowerCase() === key)) continue;
    recipients.push(email);
  }
  return recipients;
}

export function familyInviteNotice(sent: string[], failed: string[]) {
  if (failed.length > 0) {
    return `Invite sent. Could not email ${failed.join(", ")}.`;
  }
  return sent.length > 1 ? "Invite sent to both emails." : "Invite sent.";
}

export function unsentBatchNotice(sentFamilies: number, failed: string[]) {
  const invites = `Sent ${sentFamilies} invite${sentFamilies === 1 ? "" : "s"}.`;
  if (failed.length === 0) return invites;
  return `${invites} Could not email ${failed.join(", ")}.`;
}
