"use client";

import { useEffect, useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className={className ?? "btn ghost"} type="button" onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}

export function ShareLinkButton({
  title,
  url,
  text,
}: {
  title: string;
  url: string;
  text: string;
}) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);
  if (!canShare) return null;
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={() => {
        navigator.share({ title, text, url }).catch(() => {});
      }}
    >
      Share
    </button>
  );
}

export function textInviteHref(title: string, url: string) {
  const body = `You're invited to ${title}. RSVP: ${url}`;
  return `sms:?&body=${encodeURIComponent(body)}`;
}
