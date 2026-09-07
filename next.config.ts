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

// React's development diagnostics use eval to reconstruct component stacks.
// Keep production strict while allowing the local Next.js error overlay to run.
const DEVELOPMENT_CONTENT_SECURITY_POLICY = DEFAULT_CONTENT_SECURITY_POLICY.replace(
  "script-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
);

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
    value:
      process.env.NODE_ENV === "development"
        ? DEVELOPMENT_CONTENT_SECURITY_POLICY
        : DEFAULT_CONTENT_SECURITY_POLICY,
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

const homepageCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=86400, stale-while-revalidate=604800",
  },
];

const RENAMED_IMAGE_REDIRECTS = [
  ["/images/ceech/dsp-agt.jpg", "/images/ceech/dsplayers-performing-americas-got-talent.jpg"],
  ["/images/ceech/mindtricks.jpg", "/images/ceech/mindtricks-dance-group-photo.jpg"],
  ["/images/ceech/bodyrockwinner.jpg", "/images/ceech/dsplayers-2006-body-rock-winners.jpg"],
  ["/images/ceech/thinking.jpg", "/images/ceech/ceech-thinking-dance-pose.jpg"],
  ["/images/ceech/Teaching-Neck-1-sm.jpg", "/images/ceech/ceech-teaching-private-student-neck-control.jpg"],
  ["/images/ceech/calistyles.jpg", "/images/ceech/calistyles-members-before-uc-santa-cruz-performance.jpg"],
  ["/images/ceech/hat-off-pose.jpg", "/images/ceech/ceech-derby-dance-pose.jpg"],
  ["/images/ceech/ceech-mirror.jpg", "/images/ceech/ceech-dance-pose-get-down-studio.jpg"],
  ["/images/ceech/portrait-smile-small.jpg", "/images/ceech/ceech-smiling-portrait.jpg"],
  ["/images/ceech/popping-arms.jpg", "/images/ceech/ceech-samy-popping-arm-drill.jpg"],
  ["/images/ceech/teaching-knee-pop.jpg", "/images/ceech/ceech-samy-teaching-knee-pop.jpg"],
  ["/images/ceech/running-man-method-class.jpg", "/images/ceech/ceech-teaching-running-man-adult-class.jpg"],
  ["/images/ceech/group-class.jpg", "/images/ceech/ceech-teaching-adult-dance-class.jpg"],
  ["/images/posts/1845-2.jpg", "/images/posts/steve-martin-dance.jpg"],
].map(([source, destination]) => ({ source, destination, permanent: true }));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
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
        source: "/",
        headers: homepageCacheHeaders,
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
      ...RENAMED_IMAGE_REDIRECTS,
    ];
  },
};

export default nextConfig;
