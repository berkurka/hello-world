import type { CSSProperties } from "react";
import { themeById, type DisplayFont, type InviteTheme } from "@/lib/themes";

function displayStack(display: DisplayFont) {
  if (display === "fredoka") return "var(--font-fredoka), var(--font-inter), sans-serif";
  if (display === "inter") return "var(--font-inter), sans-serif";
  return "var(--font-fraunces), Georgia, serif";
}

export function themeVars(theme: InviteTheme): CSSProperties {
  return {
    "--invite-ink": theme.ink,
    "--invite-muted": theme.muted,
    "--invite-accent": theme.accent,
    "--invite-paper": theme.paper,
    "--invite-frame": theme.frame,
    "--invite-soft": theme.soft,
    "--accent": theme.accent,
    "--accent-ink": theme.accentInk,
    "--accent-soft": theme.soft,
    "--font-display": displayStack(theme.display),
    "--guest-bg": theme.dark ? theme.frame : "#f7f3ee",
    "--guest-ink": theme.ink,
    "--guest-muted": theme.muted,
    "--card": theme.dark ? "#221f2a" : "#fffcf8",
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--line": theme.dark ? "#3a3428" : "#eadfd3",
    "--surface": theme.dark ? theme.frame : "#f6f1ea",
  } as CSSProperties;
}

export function InviteCardView({
  title,
  guestName,
  when,
  place,
  hostName,
  imageSrc,
  theme,
  hero = false,
  compact = false,
}: {
  title: string;
  guestName?: string;
  when: string;
  place?: string;
  hostName: string;
  imageSrc?: string | null;
  theme: InviteTheme | string;
  hero?: boolean;
  /** RSVP card: eyebrow, title, and guest name. Details live in the rows below. */
  compact?: boolean;
}) {
  const tokens = typeof theme === "string" ? themeById(theme) : theme;
  return (
    <article
      className={hero ? "invite hero" : "invite"}
      data-theme={tokens.id}
      data-display={tokens.display}
      style={themeVars(tokens)}
      aria-label={`Invitation to ${title}`}
    >
      <div className="invite-frame">
        <div className="invite-paper">
          <div className="invite-media" aria-hidden={imageSrc ? undefined : true}>
            {imageSrc ? <img src={imageSrc} alt="" /> : null}
          </div>
          <div className="invite-body">
            <p className="invite-kicker">You&apos;re invited</p>
            <h2 className="invite-title">{title}</h2>
            {guestName ? <p className="invite-for">For {guestName}</p> : null}
            {compact ? null : (
              <>
                <p className="invite-when">{when}</p>
                {place ? <p className="invite-where">{place}</p> : null}
                <p className="invite-host">Hosted by {hostName}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
