export const PARTY_IMAGE_MAX_BYTES = 1024 * 1024;
export const PARTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const PARTY_IMAGE_BAD_TYPE = "Party image must be a JPEG, PNG, WebP, or GIF.";
export const PARTY_IMAGE_TOO_LARGE = "Party image must be 1 MB or smaller.";

export type PartyImageOk = { ok: true; mime: (typeof PARTY_IMAGE_TYPES)[number] };
export type PartyImageErr = { ok: false; error: string };
export type PartyImageInspect = PartyImageOk | PartyImageErr;

export function partyImagePath(eventId: string) {
  return `/api/party-image/${eventId}`;
}

export function sniffImageMime(bytes: Uint8Array): (typeof PARTY_IMAGE_TYPES)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  return null;
}

function declaredTypeLooksLikeImage(declaredType: string) {
  const type = declaredType.trim().toLowerCase();
  if (!type || type === "application/octet-stream") return true;
  if (type === "image/jpg") return true;
  return type.startsWith("image/") && type !== "image/svg+xml" && type !== "image/svg";
}

export function inspectPartyImage(
  bytes: Uint8Array,
  declaredType: string,
  size = bytes.length,
): PartyImageInspect {
  if (size <= 0) return { ok: false, error: "Choose an image to upload." };
  if (size > PARTY_IMAGE_MAX_BYTES) return { ok: false, error: PARTY_IMAGE_TOO_LARGE };
  if (!declaredTypeLooksLikeImage(declaredType)) return { ok: false, error: PARTY_IMAGE_BAD_TYPE };
  const mime = sniffImageMime(bytes);
  if (!mime) return { ok: false, error: PARTY_IMAGE_BAD_TYPE };
  return { ok: true, mime };
}

export function fieldKeyFromMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("title")) return "title";
  if (m.includes("date") || m.includes("time")) return "startsDate";
  if (m.includes("host name")) return "hostName";
  if (m.includes("host email") || m.includes("email is required")) return "hostEmail";
  if (m.includes("image")) return "partyImage";
  return "";
}
