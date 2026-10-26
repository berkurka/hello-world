import { isEmail, normalizeStoredEmail } from "./format";

export function inviteeEditError(input: {
  displayName: string;
  email: string | null;
  email2: string | null;
  taken: Iterable<string | null | undefined>;
}) {
  const displayName = input.displayName.trim();
  const email = normalizeStoredEmail(input.email);
  const email2 = normalizeStoredEmail(input.email2);
  if (!displayName || !email || !isEmail(email)) {
    return "Need a family or guest name and a valid email.";
  }
  if (email2 && !isEmail(email2)) return "Second email is not valid.";
  if (email2 && email2 === email) return "The two emails are the same.";
  const taken = new Set<string>();
  for (const value of input.taken) {
    const stored = normalizeStoredEmail(value);
    if (stored) taken.add(stored);
  }
  if (taken.has(email) || (email2 && taken.has(email2))) {
    return "That email is already used on this event.";
  }
  return null;
}
