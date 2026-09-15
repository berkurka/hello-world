export function isEphemeralDb() {
  return Boolean(process.env.VERCEL) && !process.env.TURSO_DATABASE_URL?.trim();
}
