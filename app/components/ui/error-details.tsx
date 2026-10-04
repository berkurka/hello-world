"use client";

import { useState } from "react";

export function ErrorDetails({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div>
      <button
        className="btn ghost"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Details
      </button>
      {open ? <p className="hint">{text}</p> : null}
    </div>
  );
}
