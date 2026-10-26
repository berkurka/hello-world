import { isEmail, normalizeStoredEmail } from "./format";

export const COHOST_LIMIT = 5;

export function coHostAddError(input: {
  email: string | null;
  hostEmail: string | null;
  existing: Iterable<string | null | undefined>;
}) {
  const email = normalizeStoredEmail(input.email);
  if (!email || !isEmail(email)) return "Enter a valid email.";
  if (email === normalizeStoredEmail(input.hostEmail)) return "That is already the host email.";
  const existing: string[] = [];
  for (const value of input.existing) {
    const stored = normalizeStoredEmail(value);
    if (stored) existing.push(stored);
  }
  if (existing.includes(email)) return "That co-host is already added.";
  if (existing.length >= COHOST_LIMIT) return `A party can have ${COHOST_LIMIT} co-hosts.`;
  return null;
}
