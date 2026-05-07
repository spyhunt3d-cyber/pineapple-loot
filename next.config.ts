import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output packages everything needed to run in Docker
  // without node_modules — keeps the image lean
  output: "standalone",

  // Allow images from Wowhead (item icons)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wow.zamimg.com",
        pathname: "/images/wow/icons/**",
      },
      {
        protocol: "https",
        hostname: "www.wowhead.com",
      },
    ],
  },
};

export default nextConfig;
