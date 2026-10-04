import { DEVICE_MAX_AGE_SECONDS, SESSION_TTL_SECONDS } from "./host-login";

function base(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function sessionCookieOptions() {
  return base(SESSION_TTL_SECONDS);
}

export function deviceCookieOptions() {
  return base(DEVICE_MAX_AGE_SECONDS);
}
