import type { ReactNode } from "react";

export function EnvelopeReveal({
  guestName,
  play,
  card,
  children,
}: {
  guestName: string;
  play: boolean;
  card: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="envelope-reveal" data-play={play ? "true" : "false"}>
      <div className="envelope-stage">
        <div className="envelope-card-rise">{card}</div>
        <div className="envelope-pocket" aria-hidden="true">
          <div className="envelope-wing" data-side="left" />
          <div className="envelope-wing" data-side="right" />
          <div className="envelope-front">
            <span className="envelope-stamp" />
            <span className="envelope-name">{guestName}</span>
          </div>
        </div>
      </div>
      <div className="envelope-details">{children}</div>
    </div>
  );
}
