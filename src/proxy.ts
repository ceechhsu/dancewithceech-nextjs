import { NextRequest, NextResponse } from "next/server";

const BLOG_CATEGORY_REDIRECTS: Record<string, string> = {
  "hip-hop-dance-moves": "/hip-hop-dance-moves",
  "locking-dance-moves": "/locking-dance-moves",
  "breaking-dance-moves": "/breaking-dance-moves",
  "funk-style-dance-moves": "/funk-style-dance-moves",
  "house-dance": "/house-dance",
  "general": "/blog",
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const category = request.nextUrl.searchParams.get("category");

  if (pathname === "/blog" && category) {
    const redirectUrl = new URL(BLOG_CATEGORY_REDIRECTS[category] ?? "/blog", request.url);
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/blog", "/blog/"],
};
