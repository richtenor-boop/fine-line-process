import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The CRM itself must never render inside another site's frame (clickjacking)...
      {
        source: "/((?!f/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      // ...except public lead-capture forms, which are meant to be embedded on the org's website.
      {
        source: "/f/:token*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

export default nextConfig;
