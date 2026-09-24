"use client";

import { useEffect, useRef } from "react";

export function Flash({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    ref.current.focus();
  }, [error]);
  if (error) {
    return (
      <p ref={ref} id="form-error" className="flash error" tabIndex={-1} role="alert">
        {error}
      </p>
    );
  }
  if (notice) return <p className="flash notice">{notice}</p>;
  return null;
}
