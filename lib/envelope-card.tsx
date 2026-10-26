import { ImageResponse } from "next/og";
import { loadCardFonts } from "./card-fonts";
import { ENVELOPE_HEIGHT, ENVELOPE_STILL_REVEAL, ENVELOPE_WIDTH } from "./envelope";
import type { InviteCardProps } from "./invite-card";
import { displayFontFamily, themeById } from "./themes";

export async function envelopeCardImage(props: InviteCardProps) {
  const fonts = await loadCardFonts();
  return new ImageResponse(<EnvelopeStill {...props} />, {
    width: ENVELOPE_WIDTH,
    height: ENVELOPE_HEIGHT,
    fonts,
  });
}

export async function envelopeCardPng(props: InviteCardProps) {
  const res = await envelopeCardImage(props);
  return Buffer.from(await res.arrayBuffer());
}

function EnvelopeStill({ guestName, title, when, location, hostName, imageSrc, theme }: InviteCardProps) {
  const tokens = themeById(theme);
  const font = displayFontFamily(tokens.display);
  const desk = tokens.dark ? tokens.frame : "#efe4d4";
  const kraft = tokens.dark ? "#3a3124" : "#f6e7cf";
  const kraftEdge = tokens.dark ? "#2a2418" : "#e4d0ae";
  const ink = tokens.dark ? tokens.ink : "#3b2a1a";
  const cardTop = 28;
  const cardLeft = 48;
  const cardWidth = ENVELOPE_WIDTH - cardLeft * 2;
  const cardHeight = 520;
  const reveal = Math.round(cardHeight * ENVELOPE_STILL_REVEAL);
  const envelopeTop = cardTop + reveal - 6;
  const envelopeLeft = 18;
  const envelopeWidth = ENVELOPE_WIDTH - envelopeLeft * 2;
  const envelopeHeight = ENVELOPE_HEIGHT - envelopeTop - 28;
  const titleSize = title.length > 28 ? 36 : title.length > 18 ? 42 : 48;
  return (
    <div
      style={{
        width: ENVELOPE_WIDTH,
        height: ENVELOPE_HEIGHT,
        display: "flex",
        position: "relative",
        backgroundColor: desk,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
          height: cardHeight,
          display: "flex",
          flexDirection: "column",
          backgroundColor: tokens.paper,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            width={cardWidth}
            height={120}
            style={{ objectFit: "cover", width: cardWidth, height: 120 }}
          />
        ) : (
          <div style={{ display: "flex", height: 14, backgroundColor: tokens.accent }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "22px 32px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: tokens.accent,
              fontSize: 15,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            You&apos;re invited
          </div>
          <div
            style={{
              display: "flex",
              color: tokens.ink,
              fontFamily: font,
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.05,
              marginTop: 10,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              color: tokens.ink,
              fontSize: 24,
              fontWeight: 600,
              marginTop: 16,
            }}
          >
            {when}
          </div>
          {location ? (
            <div style={{ display: "flex", color: tokens.muted, fontSize: 20, marginTop: 8 }}>{location}</div>
          ) : null}
          <div style={{ display: "flex", color: tokens.accent, fontSize: 18, fontWeight: 600, marginTop: 14 }}>
            {`Hosted by ${hostName}`}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: envelopeTop,
          left: envelopeLeft,
          width: envelopeWidth,
          height: envelopeHeight,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 26,
            backgroundColor: kraftEdge,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        />
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: kraft,
            color: ink,
            fontFamily: font,
            fontSize: guestName.length > 24 ? 28 : 40,
            fontWeight: 600,
            padding: "8px 28px 20px",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        >
          {guestName}
        </div>
      </div>
    </div>
  );
}
