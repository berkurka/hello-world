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
  const dark = tokens.dark;
  const desk = dark ? "#12100c" : "#efe4d4";
  const kraft = dark ? "#3c342b" : "#f3e0c0";
  const kraftDeep = dark ? "#2c261f" : "#e4cb9c";
  const kraftEdge = dark ? "#1f1a15" : "#b8894a";
  const flap = dark ? "#6a5a42" : "#d7b57a";
  const ink = dark ? "#f4ead6" : "#3b2a1a";
  const rule = dark ? "#6d5c46" : "#d7c09a";
  const cardLeft = 108;
  const cardTop = 36;
  const cardWidth = ENVELOPE_WIDTH - cardLeft * 2;
  const cardHeight = 500;
  const reveal = Math.round(cardHeight * ENVELOPE_STILL_REVEAL);
  const pocketTop = cardTop + reveal - 4;
  const envelopeLeft = 18;
  const envelopeWidth = ENVELOPE_WIDTH - envelopeLeft * 2;
  const pocketHeight = ENVELOPE_HEIGHT - pocketTop - 22;
  const flapH = 156;
  const flapTop = pocketTop - flapH + 6;
  const titleSize = title.length > 32 ? 32 : title.length > 22 ? 38 : 44;
  const nameSize = guestName.length > 28 ? 26 : guestName.length > 18 ? 32 : 40;
  const photoH = imageSrc ? 92 : 0;
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
          top: flapTop,
          left: envelopeLeft,
          width: envelopeWidth,
          height: flapH,
          display: "flex",
        }}
      >
        <div
          style={{
            width: envelopeWidth / 2,
            height: flapH,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0) 49.2%, ${flap} 50%)`,
          }}
        />
        <div
          style={{
            width: envelopeWidth / 2,
            height: flapH,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom left, rgba(0,0,0,0) 49.2%, ${flap} 50%)`,
          }}
        />
      </div>
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
          borderRadius: 14,
          overflow: "hidden",
          border: `3px solid ${tokens.frame}`,
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            width={cardWidth}
            height={photoH}
            style={{ objectFit: "cover", width: cardWidth, height: photoH }}
          />
        ) : (
          <div style={{ display: "flex", height: 12, backgroundColor: tokens.accent }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", padding: "18px 28px 8px" }}>
          <div
            style={{
              display: "flex",
              color: tokens.accent,
              fontSize: 13,
              letterSpacing: 2.4,
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
              marginTop: 8,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              color: tokens.ink,
              fontSize: 22,
              fontWeight: 600,
              marginTop: 14,
            }}
          >
            {when}
          </div>
          {location ? (
            <div style={{ display: "flex", color: tokens.muted, fontSize: 18, marginTop: 6 }}>{location}</div>
          ) : null}
          <div style={{ display: "flex", color: tokens.accent, fontSize: 16, fontWeight: 600, marginTop: 10 }}>
            {`Hosted by ${hostName}`}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: pocketTop,
          left: envelopeLeft,
          width: envelopeWidth,
          height: pocketHeight,
          display: "flex",
          flexDirection: "column",
          backgroundColor: kraft,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      >
        <div style={{ display: "flex", height: 16, backgroundColor: kraftEdge }} />
        <div style={{ display: "flex", height: 10, backgroundColor: kraftDeep }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 28,
            right: 26,
            width: 58,
            height: 68,
            border: `3px solid ${tokens.accent}`,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: dark ? "#2a241c" : "#fffaf2",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: tokens.accent,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 96px 18px 36px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: ink,
              fontFamily: font,
              fontSize: nameSize,
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            {guestName}
          </div>
          <div style={{ display: "flex", width: 210, height: 2, backgroundColor: rule, marginTop: 14 }} />
          <div style={{ display: "flex", width: 160, height: 2, backgroundColor: rule, marginTop: 10 }} />
        </div>
      </div>
    </div>
  );
}
