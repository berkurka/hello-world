import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="fact-icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function PartyFacts({
  when,
  place,
  hostName,
  notes,
  calendar,
  maps,
}: {
  when: string;
  place?: string;
  hostName: string;
  notes?: string | null;
  /** Item 10 fills this with Add to calendar. */
  calendar?: ReactNode;
  /** Item 10 fills this with Open in Maps. */
  maps?: ReactNode;
}) {
  return (
    <div className="facts">
      <div className="fact">
        <Icon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </Icon>
        <div>
          <div className="fact-label">When</div>
          <p>{when}</p>
          {calendar ? <div className="fact-actions">{calendar}</div> : null}
        </div>
      </div>
      {place || maps ? (
        <div className="fact">
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </Icon>
          <div>
            <div className="fact-label">Place</div>
            {place ? <p>{place}</p> : null}
            {maps ? <div className="fact-actions">{maps}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="fact">
        <Icon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" />
          </svg>
        </Icon>
        <div>
          <div className="fact-label">Host</div>
          <p>{hostName}</p>
        </div>
      </div>
      {notes ? (
        <div className="fact">
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4h12v16H6z" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>
          </Icon>
          <div>
            <div className="fact-label">Notes</div>
            <p>{notes}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
