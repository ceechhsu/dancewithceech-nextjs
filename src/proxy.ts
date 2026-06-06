import { NextRequest, NextResponse } from "next/server";

const BLOG_CATEGORY_REDIRECTS: Record<string, string> = {
  "hip-hop-dance-moves": "/hip-hop-dance-moves",
  "locking-dance-moves": "/locking-dance-moves",
  "breaking-dance-moves": "/breaking-dance-moves",
  "funk-style-dance-moves": "/funk-style-dance-moves",
  "house-dance": "/house-dance",
  "general": "/blog",
};

const BLOCKED_PERMISSIONS = "camera=(), microphone=(), geolocation=(), browsing-topics=()";
const PRACTICE_PERMISSIONS = "camera=(self), microphone=(self), geolocation=(), browsing-topics=()";

function createNonce() {
  return btoa(crypto.randomUUID());
}

function isBeatFirstPracticePath(pathname: string) {
  return (
    pathname === "/beat-first/practice"
    || pathname.startsWith("/beat-first/practice/")
    || pathname.startsWith("/beatfirst-practice/")
    || pathname.startsWith("/api/beatfirst-practice/")
  );
}

function createPracticeContentSecurityPolicy() {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self' https:;
    frame-src 'self';
    media-src 'self' blob:;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

function createContentSecurityPolicy(nonce: string, pathname: string) {
  if (isBeatFirstPracticePath(pathname)) return createPracticeContentSecurityPolicy();

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net;
    frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://calendly.com https://*.calendly.com;
    media-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

function setSecurityHeaders(response: NextResponse, csp: string, pathname: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Permissions-Policy",
    isBeatFirstPracticePath(pathname) ? PRACTICE_PERMISSIONS : BLOCKED_PERMISSIONS,
  );
}

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const rawPathname = request.nextUrl.pathname;
  const pathname = rawPathname.replace(/\/$/, "") || "/";
  const csp = createContentSecurityPolicy(nonce, rawPathname);
  const category = request.nextUrl.searchParams.get("category");

  if (pathname === "/blog" && category) {
    const redirectUrl = new URL(BLOG_CATEGORY_REDIRECTS[category] ?? "/blog", request.url);
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl, 308);
    setSecurityHeaders(redirectResponse, csp, rawPathname);
    return redirectResponse;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  setSecurityHeaders(response, csp, rawPathname);
  return response;
}

export const config = {
  matcher: [
    "/api/beatfirst-practice/:path*",
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|logo-mark.png|hero-mobile.mp4|images|captions).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
