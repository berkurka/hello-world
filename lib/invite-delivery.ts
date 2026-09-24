export type InviteDelivery = {
  sent: string[];
  failed: string[];
};

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
