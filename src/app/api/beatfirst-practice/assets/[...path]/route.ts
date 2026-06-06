import { NextRequest, NextResponse } from "next/server";

function getBackendOrigin() {
  return process.env.BEATFIRST_ANALYSIS_ORIGIN?.replace(/\/$/, "") || "";
}

function rejectUnconfigured() {
  return NextResponse.json(
    {
      error: "BeatFirst analysis backend is not configured for this private beta route.",
    },
    { status: 503 },
  );
}

function isSafeAssetPath(path: string) {
  return Boolean(path) && !path.includes("..") && !path.startsWith("/");
}

function toStaticPracticeAsset(value: string) {
  const cleanPath = value.replace(/^\/+/, "");
  if (cleanPath.startsWith("edit/submissions/")) {
    return `/api/beatfirst-practice/assets/${cleanPath}`;
  }
  if (cleanPath.startsWith("edit/")) {
    return `/beatfirst-practice/${cleanPath}`;
  }
  return value;
}

function rewriteManifestAsset(value: unknown) {
  if (typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value)) return value;
  return toStaticPracticeAsset(value);
}

function rewriteManifest(manifest: Record<string, unknown>) {
  const rewritten: Record<string, unknown> = {
    ...manifest,
    video: rewriteManifestAsset(manifest.video),
    beats: rewriteManifestAsset(manifest.beats),
    pose: rewriteManifestAsset(manifest.pose),
    waveform: rewriteManifestAsset(manifest.waveform),
    referenceVideo: rewriteManifestAsset(manifest.referenceVideo),
    referenceVideoFallback: rewriteManifestAsset(manifest.referenceVideoFallback),
    referenceContacts: rewriteManifestAsset(manifest.referenceContacts),
    referencePose: rewriteManifestAsset(manifest.referencePose),
  };

  const audio = manifest.audio as { mic?: { url?: unknown } } | undefined;
  if (audio?.mic) {
    rewritten.audio = {
      ...audio,
      mic: {
        ...audio.mic,
        url: rewriteManifestAsset(audio.mic.url),
      },
    };
  }

  return rewritten;
}

function copyResponseHeaders(source: Response) {
  const headers = new Headers();
  for (const key of [
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ]) {
    const value = source.headers.get(key);
    if (value) headers.set(key, value);
  }
  return headers;
}

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const origin = getBackendOrigin();
  if (!origin) return rejectUnconfigured();

  const { path } = await context.params;
  const assetPath = path.join("/");
  if (!isSafeAssetPath(assetPath)) {
    return NextResponse.json({ error: "Invalid BeatFirst asset path." }, { status: 400 });
  }

  const backendUrl = new URL(`/${path.map(encodeURIComponent).join("/")}`, origin);
  backendUrl.search = req.nextUrl.search;

  const headers = new Headers();
  const range = req.headers.get("range");
  if (range) headers.set("range", range);

  const backendResponse = await fetch(backendUrl, {
    headers,
    cache: "no-store",
  });

  const contentType = backendResponse.headers.get("content-type") || "";
  if (assetPath.endsWith("analysis.json") && contentType.includes("application/json")) {
    const manifest = await backendResponse.json();
    return NextResponse.json(rewriteManifest(manifest), {
      status: backendResponse.status,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: copyResponseHeaders(backendResponse),
  });
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const response = await GET(req, context);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
