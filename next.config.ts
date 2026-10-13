import type { NextConfig } from "next";
import { appRouteExists } from "./lib/app-route";
import { FIND_PARTIES_PATH, MY_PARTIES_PATH } from "./lib/paths";

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    HOST_PARTIES_LINK: appRouteExists(MY_PARTIES_PATH) ? "1" : "0",
    HOST_RECOVER_LINK: appRouteExists(FIND_PARTIES_PATH) ? "1" : "0",
  },
  serverExternalPackages: ["@libsql/client", "nodemailer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/e/:id/manage",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/e/:id/guests.csv",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
