"use client";

import { useState } from "react";

export function PartyPhoto({ src }: { src: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return <img src={src} alt="" onError={() => setHidden(true)} />;
}
