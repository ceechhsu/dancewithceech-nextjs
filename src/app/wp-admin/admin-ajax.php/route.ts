const goneHeaders = {
  "cache-control": "public, max-age=3600",
  "content-type": "text/plain; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};

export function GET() {
  return new Response("Gone", {
    status: 410,
    headers: goneHeaders,
  });
}

export function HEAD() {
  return new Response(null, {
    status: 410,
    headers: goneHeaders,
  });
}
