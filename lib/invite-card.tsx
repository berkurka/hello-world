import { ImageResponse } from "next/og";

export type InviteCardProps = {
  guestName: string;
  title: string;
  when: string;
  location: string;
  hostName: string;
  imageSrc?: string | null;
};

export function inviteCardImage(props: InviteCardProps) {
  return new ImageResponse(<InviteCard {...props} />, {
    width: 800,
    height: 500,
  });
}

export async function inviteCardPng(props: InviteCardProps) {
  const res = inviteCardImage(props);
  return Buffer.from(await res.arrayBuffer());
}

function InviteCard({ guestName, title, when, location, hostName, imageSrc }: InviteCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#3b1d2a",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fbf6ee",
          overflow: "hidden",
        }}
      >
        {imageSrc ? (
          <div style={{ display: "flex", width: "100%", height: 168 }}>
            <img
              src={imageSrc}
              alt=""
              width={764}
              height={168}
              style={{ objectFit: "cover", width: 764, height: 168 }}
            />
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            padding: imageSrc ? "28px 48px 36px" : "42px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#8b2942",
                fontSize: 22,
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              You are invited
            </div>
            <div
              style={{
                display: "flex",
                color: "#2c1810",
                fontSize: imageSrc ? 46 : 56,
                marginTop: 12,
                lineHeight: 1.1,
              }}
            >
              {guestName}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#2c1810",
                fontSize: 36,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                color: "#5c4638",
                fontSize: 22,
                marginTop: 16,
              }}
            >
              {when}
            </div>
            {location ? (
              <div
                style={{
                  display: "flex",
                  color: "#5c4638",
                  fontSize: 20,
                  marginTop: 8,
                }}
              >
                {location}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              color: "#8b2942",
              fontSize: 20,
            }}
          >
            Hosted by {hostName}
          </div>
        </div>
      </div>
    </div>
  );
}
