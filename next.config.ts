import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "wow.zamimg.com",    pathname: "/images/wow/icons/**" },
      { protocol: "https", hostname: "www.wowhead.com"   },
      { protocol: "https", hostname: "wotlk.wowhead.com" },
      { protocol: "https", hostname: "classic.wowhead.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://wow.zamimg.com https://nether.wowhead.com https://www.wowhead.com",
              "style-src 'self' 'unsafe-inline' https://wow.zamimg.com",
              "img-src 'self' data: https://wow.zamimg.com https://www.wowhead.com https://nether.wowhead.com https://wotlk.wowhead.com https://classic.wowhead.com",
              "connect-src 'self' https://softres.it https://www.wowhead.com https://nether.wowhead.com https://raid-helper.xyz https://raid-helper.dev",
              "font-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
