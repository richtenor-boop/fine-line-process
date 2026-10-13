import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Document uploads go through a Server Action (default limit 1MB). 5MB leaves room for the
    // 4MB file cap in documents/schema.ts plus multipart overhead, under Vercel's 4.5MB body limit.
    serverActions: { bodySizeLimit: "5mb" },
  },
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
