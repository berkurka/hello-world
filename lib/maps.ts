export function googleMapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function appleMapsUrl(location: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
}

export function mapsUrl(location: string, userAgent = "") {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return appleMapsUrl(location);
  return googleMapsUrl(location);
}
