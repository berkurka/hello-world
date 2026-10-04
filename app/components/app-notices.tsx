"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WelcomeState = {
  mail: string | null;
  mailError: string | null;
};

let welcome: WelcomeState | null = null;
const listeners = new Set<() => void>();

function publishWelcome(value: WelcomeState | null) {
  welcome = value;
  listeners.forEach((listener) => listener());
}

export function useWelcome() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => welcome,
    () => null,
  );
}

type Toast = { id: number; kind: "ok" | "error"; text: string };

const DROP = ["error", "notice", "done", "welcome", "mail", "mailError"];

export function AppNotices() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const consumed = useRef<string | null>(null);

  useEffect(() => {
    const raw = params.toString();
    const error = params.get("error");
    const notice = params.get("notice");
    const done = params.get("done");
    const welcomeFlag = params.get("welcome");
    const mail = params.get("mail");
    const mailError = params.get("mailError");
    const hasFlash = Boolean(error || notice || done || welcomeFlag || mail || mailError);
    if (!hasFlash || consumed.current === raw) return;
    consumed.current = raw;
    const next: Toast[] = [];
    if (notice) next.push({ id: Date.now(), kind: "ok", text: notice });
    if (error) next.push({ id: Date.now() + 1, kind: "error", text: error });
    if (done === "1") next.push({ id: Date.now() + 2, kind: "ok", text: "Saved" });
    if (next.length) setToasts((current) => [...next, ...current].slice(0, 4));
    if (welcomeFlag || mail || mailError) publishWelcome({ mail, mailError });
    const kept = new URLSearchParams(params.toString());
    for (const key of DROP) kept.delete(key);
    const query = kept.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  if (toasts.length === 0) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={toast.kind === "error" ? "toast error" : "toast ok"} role="status">
          <p>{toast.text}</p>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
