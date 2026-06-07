import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isSafeSubmissionId(value: string) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function getBackendOrigin() {
  return process.env.BEATFIRST_ANALYSIS_ORIGIN?.replace(/\/$/, "") || "";
}

function getBackendToken() {
  return process.env.BEATFIRST_ANALYSIS_TOKEN?.trim() || "";
}

function rejectUnconfigured() {
  return NextResponse.json(
    {
      error: "BeatFirst analysis backend is not configured for this private beta route.",
    },
    { status: 503 },
  );
}

function toPrivateAssetUrl(assetPath: string) {
  const cleanPath = assetPath.replace(/^\/+/, "");
  return `/api/beatfirst-practice/assets/${cleanPath}`;
}

function toPrivatePlayerUrl(manifestUrl: string | undefined) {
  return manifestUrl
    ? `/beatfirst-practice/index.html?manifest=${encodeURIComponent(manifestUrl)}`
    : "/beatfirst-practice/index.html";
}

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { submissionId } = await context.params;
  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json({ error: "Invalid BeatFirst submission request." }, { status: 400 });
  }

  const origin = getBackendOrigin();
  if (!origin) return rejectUnconfigured();

  const headers = new Headers();
  const token = getBackendToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const backendResponse = await fetch(
    `${origin}/api/submissions/${encodeURIComponent(submissionId)}/analyze/progress`,
    {
      cache: "no-store",
      headers,
    },
  );
  const payload = await backendResponse.json().catch(() => ({}));

  if (payload?.manifestUrl && typeof payload.manifestUrl === "string") {
    payload.manifestUrl = toPrivateAssetUrl(payload.manifestUrl);
  }
  if (payload?.playerUrl && typeof payload.playerUrl === "string") {
    payload.playerUrl = toPrivatePlayerUrl(payload.manifestUrl);
  }

  return NextResponse.json(payload, { status: backendResponse.status });
}
