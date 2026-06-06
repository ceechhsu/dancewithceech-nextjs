import type { NextConfig } from "next";
import redirectsJson from "./src/content/redirects.json";

const BLOG_CATEGORY_REDIRECTS: Record<string, string> = {
  "hip-hop-dance-moves": "/hip-hop-dance-moves",
  "locking-dance-moves": "/locking-dance-moves",
  "breaking-dance-moves": "/breaking-dance-moves",
  "funk-style-dance-moves": "/funk-style-dance-moves",
  "house-dance": "/house-dance",
  "general": "/blog",
};

const DEFAULT_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://calendly.com https://*.calendly.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const PRACTICE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const BLOCKED_PERMISSIONS = "camera=(), microphone=(), geolocation=(), browsing-topics=()";
const PRACTICE_PERMISSIONS = "camera=(self), microphone=(self), geolocation=(), browsing-topics=()";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Content-Security-Policy",
    value: DEFAULT_CONTENT_SECURITY_POLICY,
  },
  {
    key: "Permissions-Policy",
    value: BLOCKED_PERMISSIONS,
  },
];

const immutableCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/beat-first/practice/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: PRACTICE_CONTENT_SECURITY_POLICY,
          },
          {
            key: "Permissions-Policy",
            value: PRACTICE_PERMISSIONS,
          },
        ],
      },
      {
        source: "/beatfirst-practice/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: PRACTICE_CONTENT_SECURITY_POLICY,
          },
          {
            key: "Permissions-Policy",
            value: PRACTICE_PERMISSIONS,
          },
        ],
      },
      {
        source: "/api/beatfirst-practice/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: PRACTICE_CONTENT_SECURITY_POLICY,
          },
          {
            key: "Permissions-Policy",
            value: PRACTICE_PERMISSIONS,
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: immutableCacheHeaders,
      },
      {
        source: "/captions/:path*",
        headers: immutableCacheHeaders,
      },
      {
        source: "/hero-mobile.mp4",
        headers: immutableCacheHeaders,
      },
      {
        source: "/logo-mark.png",
        headers: immutableCacheHeaders,
      },
      {
        source: "/favicon.png",
        headers: immutableCacheHeaders,
      },
      {
        source: "/favicon.ico",
        headers: immutableCacheHeaders,
      },
    ];
  },
  async redirects() {
    return [
      ...Object.entries(BLOG_CATEGORY_REDIRECTS).map(([category, destination]) => ({
        source: "/blog",
        has: [{ type: "query" as const, key: "category", value: category }],
        destination,
        permanent: true,
      })),
      ...redirectsJson.map((r) => ({
        source: r.source,
        destination: r.destination,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
