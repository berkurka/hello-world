import { cookies, headers } from "next/headers";
import { deviceCookieOptions, sessionCookieOptions } from "./cookie-options";
import { grantDevice, DEVICE_COOKIE, SESSION_COOKIE, clientIpFromHeaders } from "./host-login";
import { newToken } from "./ids";

export async function readHostCreds() {
  const jar = await cookies();
  return {
    sessionToken: jar.get(SESSION_COOKIE)?.value ?? null,
    deviceToken: jar.get(DEVICE_COOKIE)?.value ?? null,
  };
}

export async function readClientIp() {
  return clientIpFromHeaders(await headers());
}

export async function writeSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function clearDeviceCookie() {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE, "", { ...deviceCookieOptions(), maxAge: 0 });
}

export async function rememberCreatedParty(eventId: string) {
  const jar = await cookies();
  let token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) {
    token = newToken();
    jar.set(DEVICE_COOKIE, token, deviceCookieOptions());
  }
  await grantDevice(eventId, token);
}
