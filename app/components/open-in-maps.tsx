"use client";

import { useEffect, useState } from "react";
import { googleMapsUrl, mapsUrl } from "@/lib/maps";

export function OpenInMaps({ location }: { location: string }) {
  const [href, setHref] = useState(() => googleMapsUrl(location));
  useEffect(() => {
    setHref(mapsUrl(location, navigator.userAgent));
  }, [location]);
  if (!location.trim()) return null;
  return (
    <a className="btn ghost small" href={href} target="_blank" rel="noreferrer">
      Open in Maps
    </a>
  );
}
