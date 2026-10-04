import { ImageResponse } from "next/og";
import { loadCardFonts } from "./card-fonts";
import { displayFontFamily, themeById, type InviteTheme } from "./themes";

export const INVITE_CARD_WIDTH = 1200;
export const INVITE_CARD_HEIGHT = 750;

export type InviteCardProps = {
  guestName: string;
  title: string;
  when: string;
  location: string;
  hostName: string;
  imageSrc?: string | null;
  theme?: string | null;
};

export type InviteCardSize = {
  width: number;
  height: number;
};

export async function inviteCardImage(props: InviteCardProps, size?: InviteCardSize) {
  const width = size?.width ?? INVITE_CARD_WIDTH;
  const height = size?.height ?? INVITE_CARD_HEIGHT;
  const fonts = await loadCardFonts();
  return new ImageResponse(<OgInviteCard {...props} width={width} height={height} />, {
    width,
    height,
    fonts,
  });
}

export async function inviteCardPng(props: InviteCardProps, size?: InviteCardSize) {
  const res = await inviteCardImage(props, size);
  return Buffer.from(await res.arrayBuffer());
}

function OgInviteCard({
  guestName,
  title,
  when,
  location,
  hostName,
  imageSrc,
  theme,
  width,
  height,
}: InviteCardProps & InviteCardSize) {
  const tokens = themeById(theme);
  const scale = height / INVITE_CARD_HEIGHT;
  const px = (value: number) => Math.round(value * scale);
  const titleSize = px(title.length > 36 ? 64 : title.length > 22 ? 76 : 92);
  const font = displayFontFamily(tokens.display);
  const pad = px(28);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const bandH = imageSrc ? px(220) : px(132);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        boxSizing: "border-box",
        backgroundColor: tokens.frame,
        padding: pad,
        fontFamily: "Inter",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: innerW,
          height: innerH,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          backgroundColor: tokens.paper,
          overflow: "hidden",
          borderRadius: px(18),
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            width={innerW}
            height={bandH}
            style={{ objectFit: "cover", width: innerW, height: bandH }}
          />
        ) : (
          <PatternBand theme={tokens} height={bandH} width={innerW} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: `${px(28)}px ${px(48)}px ${px(32)}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              color: tokens.accent,
              fontSize: px(22),
              letterSpacing: px(4),
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
              marginTop: px(10),
              lineHeight: 1.02,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          {guestName ? (
            <div
              style={{
                display: "flex",
                color: tokens.muted,
                fontSize: px(28),
                marginTop: px(10),
              }}
            >
              {`For ${guestName}`}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              color: tokens.ink,
              fontSize: px(30),
              fontWeight: 600,
              marginTop: px(18),
            }}
          >
            {when}
          </div>
          {location ? (
            <div
              style={{
                display: "flex",
                color: tokens.muted,
                fontSize: px(26),
                marginTop: px(8),
              }}
            >
              {location}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              color: tokens.accent,
              fontSize: px(24),
              marginTop: px(16),
              fontWeight: 600,
            }}
          >
            {`Hosted by ${hostName}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatternBand({ theme, height, width }: { theme: InviteTheme; height: number; width: number }) {
  const palette = patternColors(theme);
  const count = Math.max(14, Math.round(width / 72));
  const dots = Array.from({ length: count }, (_, index) => palette[index % palette.length]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        width,
        height,
        backgroundColor: theme.dark ? "#221c16" : theme.soft,
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      {dots.map((color, index) => (
        <div
          key={`${color}-${index}`}
          style={{
            width: index % 3 === 0 ? 22 : 14,
            height: index % 3 === 0 ? 22 : 14,
            borderRadius: 20,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

function patternColors(theme: InviteTheme) {
  if (theme.id === "midnight") return ["#e4c36a", "#8a7040", "#f7efd8", "#e4c36a", "#5c4a2a", "#f0d78c"];
  if (theme.id === "garden") return ["#1f7a45", "#8fce9a", "#c6e6cf", "#2f6b45", "#d7efc8", "#1c3d2c"];
  if (theme.id === "playful") return ["#ef5b2a", "#2f6fed", "#ffc53d", "#7c5cff", "#ff8f6b", "#3dcbff"];
  if (theme.id === "confetti") return ["#d61f78", "#7c5cff", "#ffc53d", "#3dcbff", "#ff7a3d", "#c84bff"];
  if (theme.id === "minimal") return ["#1a1a1a", "#d0d0d0", "#1a1a1a", "#d0d0d0", "#1a1a1a", "#d0d0d0"];
  return ["#9a3048", "#e7b3c2", "#3b1d2a", "#f3d5de", "#9a3048", "#c4576e"];
}
