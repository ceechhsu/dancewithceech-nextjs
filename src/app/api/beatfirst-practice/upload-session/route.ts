import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECT_UPLOAD_MAX_BYTES = 31 * 1024 * 1024;
const SESSION_TTL_MS = 15 * 60 * 1000;

function isSafeSubmissionId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function getBackendOrigin() {
  return process.env.BEATFIRST_ANALYSIS_ORIGIN?.replace(/\/$/, "") || "";
}

function getBackendToken() {
  return process.env.BEATFIRST_ANALYSIS_TOKEN?.trim() || "";
}

function createSubmissionUploadToken({
  submissionId,
  expiresAtMs,
  backendToken,
}: {
  submissionId: string;
  expiresAtMs: number;
  backendToken: string;
}) {
  const signature = createHmac("sha256", backendToken)
    .update(`${submissionId}.${expiresAtMs}`)
    .digest("base64url");
  return `v1.${expiresAtMs}.${signature}`;
}

export async function POST(req: Request) {
  const origin = getBackendOrigin();
  const backendToken = getBackendToken();
  if (!origin || !backendToken) {
    return NextResponse.json(
      {
        error: "BeatFirst analysis backend is not configured for this private beta route.",
      },
      { status: 503 },
    );
  }

  const payload = await req.json().catch(() => ({}));
  if (!isSafeSubmissionId(payload.submissionId)) {
    return NextResponse.json({ error: "Invalid BeatFirst submission id." }, { status: 400 });
  }

  const submissionId = payload.submissionId;
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  return NextResponse.json({
    submissionId,
    uploadBaseUrl: `${origin}/api/submissions/${encodeURIComponent(submissionId)}`,
    uploadToken: createSubmissionUploadToken({
      submissionId,
      expiresAtMs,
      backendToken,
    }),
    expiresAtMs,
    maxUploadBytes: DIRECT_UPLOAD_MAX_BYTES,
  });
}
