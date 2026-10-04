"use client";

import { useState } from "react";
import { Sheet } from "@/app/components/ui/sheet";

export function DashboardShell({
  title,
  when,
  place,
  previewHref,
  editor,
  children,
}: {
  title: string;
  when: string;
  place: string;
  previewHref: string;
  editor: React.ReactNode;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="dash-top">
        <div>
          <h1>{title}</h1>
          <p className="lede">
            {when}
            {place ? ` · ${place}` : ""}
          </p>
        </div>
        <div className="actions">
          <a className="btn ghost" href="#share">
            Share
          </a>
          <a className="btn ghost" href={previewHref}>
            Preview as guest
          </a>
          <button className="btn" type="button" aria-haspopup="dialog" aria-expanded={editing} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </div>
      {children}
      <Sheet open={editing} title="Edit party" onClose={() => setEditing(false)}>
        {editor}
      </Sheet>
    </>
  );
}
