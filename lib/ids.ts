import { randomBytes, randomUUID } from "crypto";

export function newId() {
  return randomUUID();
}

export function newToken() {
  return randomBytes(24).toString("base64url");
}
