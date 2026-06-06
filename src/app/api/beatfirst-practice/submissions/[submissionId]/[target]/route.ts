import { NextResponse } from "next/server";

const VALID_TARGETS = new Set(["recording", "calibration", "metadata", "analyze"]);

function isSafeSubmissionId(value: string) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

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

function toPrivateAssetUrl(assetPath: string) {
  const cleanPath = assetPath.replace(/^\/+/, "");
  return `/api/beatfirst-practice/assets/${cleanPath}`;
}

async function proxyToBackend(
  req: Request,
  submissionId: string,
  target: string,
) {
  if (!isSafeSubmissionId(submissionId) || !VALID_TARGETS.has(target)) {
    return NextResponse.json({ error: "Invalid BeatFirst submission request." }, { status: 400 });
  }

  const origin = getBackendOrigin();
  if (!origin) return rejectUnconfigured();

  const backendUrl = `${origin}/api/submissions/${encodeURIComponent(submissionId)}/${target}`;
  const headers = new Headers(req.headers);
  headers.delete("host");

  const backendResponse = await fetch(backendUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const contentType = backendResponse.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "content-type": contentType || "application/octet-stream",
      },
    });
  }

  const payload = await backendResponse.json();
  if (payload?.manifestUrl && typeof payload.manifestUrl === "string") {
    payload.manifestUrl = toPrivateAssetUrl(payload.manifestUrl);
  }
  if (payload?.playerUrl && typeof payload.playerUrl === "string") {
    payload.playerUrl = payload.manifestUrl
      ? `/beatfirst-practice/index.html?manifest=${encodeURIComponent(payload.manifestUrl)}`
      : "/beatfirst-practice/index.html";
  }

  return NextResponse.json(payload, { status: backendResponse.status });
}

type RouteContext = {
  params: Promise<{
    submissionId: string;
    target: string;
  }>;
};

export async function PUT(req: Request, context: RouteContext) {
  const { submissionId, target } = await context.params;
  return proxyToBackend(req, submissionId, target);
}

export async function POST(req: Request, context: RouteContext) {
  const { submissionId, target } = await context.params;
  return proxyToBackend(req, submissionId, target);
}
