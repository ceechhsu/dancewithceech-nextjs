import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WORDPRESS_SEARCH_PLACEHOLDER = "{search_term_string}";
const WORDPRESS_PHP_PROBE = /^\/wp-[^/]*\.php$/;
const LEGACY_QUERY_PARAMS = ["et_blog"] as const;
const LEGACY_REFERRERS: readonly string[] = ["aftership"];
const LEGACY_ARCHIVE_DESTINATIONS = [
  ["/locking-dance-moves/page/", "/locking-dance-moves"],
  ["/funk-style-dance-moves/page/", "/funk-style-dance-moves"],
  ["/hip-hop-dance-moves/page/", "/hip-hop-dance-moves"],
  ["/category/dance-moves/locking-dance-moves/page/", "/locking-dance-moves"],
] as const;
const GONE_HEADERS = {
  "cache-control": "public, max-age=3600",
  "content-type": "text/plain; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};

function isLegacyWordPressProbe(pathname: string) {
  return (
    pathname === "/*" ||
    pathname.endsWith("/feed/") ||
    pathname.endsWith("/feed") ||
    pathname === "/category/uncategorized/" ||
    pathname === "/category/uncategorized" ||
    pathname.startsWith("/wp-content/") ||
    pathname.startsWith("/wp-admin/") ||
    WORDPRESS_PHP_PROBE.test(pathname)
  );
}

function getLegacyArchiveDestination(pathname: string) {
  const normalizedPathname = pathname.endsWith("/") ? pathname : `${pathname}/`;

  for (const [prefix, destination] of LEGACY_ARCHIVE_DESTINATIONS) {
    if (/\/page\/\d+\/$/.test(normalizedPathname) && normalizedPathname.startsWith(prefix)) {
      return destination;
    }
  }

  return null;
}

function getCleanQueryUrl(request: NextRequest) {
  const cleanUrl = request.nextUrl.clone();
  let changed = false;

  for (const param of LEGACY_QUERY_PARAMS) {
    if (cleanUrl.searchParams.has(param)) {
      cleanUrl.searchParams.delete(param);
      changed = true;
    }
  }

  const referrers = cleanUrl.searchParams.getAll("ref");
  if (referrers.some((referrer) => LEGACY_REFERRERS.includes(referrer))) {
    cleanUrl.searchParams.delete("ref");
    changed = true;
  }

  return changed ? cleanUrl : null;
}

export function proxy(request: NextRequest) {
  if (isLegacyWordPressProbe(request.nextUrl.pathname)) {
    return new Response("Gone", {
      status: 410,
      headers: GONE_HEADERS,
    });
  }

  const archiveDestination = getLegacyArchiveDestination(request.nextUrl.pathname);
  if (archiveDestination) {
    const archiveUrl = request.nextUrl.clone();
    archiveUrl.pathname = archiveDestination;
    archiveUrl.search = "";

    return NextResponse.redirect(archiveUrl, 308);
  }

  if (request.nextUrl.searchParams.get("s") === WORDPRESS_SEARCH_PLACEHOLDER) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.search = "";

    return NextResponse.redirect(cleanUrl, 308);
  }

  const cleanQueryUrl = getCleanQueryUrl(request);
  if (cleanQueryUrl) {
    return NextResponse.redirect(cleanQueryUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
