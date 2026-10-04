"use client";

import { useFormStatus } from "react-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return ["btn", variant === "primary" ? "" : variant, extra].filter(Boolean).join(" ");
}

export function SubmitButton({
  label,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
}: {
  label: string;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={buttonClass(variant, className)} type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
