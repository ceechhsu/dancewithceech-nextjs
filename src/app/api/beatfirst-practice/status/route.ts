export const dynamic = "force-dynamic";

function getBackendOrigin() {
  return process.env.BEATFIRST_ANALYSIS_ORIGIN?.replace(/\/$/, "") || "";
}

function getBackendToken() {
  return process.env.BEATFIRST_ANALYSIS_TOKEN?.trim() || "";
}

function getBackendHeaders() {
  const headers = new Headers();
  const token = getBackendToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

export async function GET() {
  const origin = getBackendOrigin();
  if (!origin) {
    return Response.json({
      analysisConfigured: false,
      canAnalyze: false,
      message: "BeatFirst analysis backend is not configured for this private beta route.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    const backendResponse = await fetch(`${origin}/api/status`, {
      cache: "no-store",
      headers: getBackendHeaders(),
      signal: controller.signal,
    });
    const payload = await backendResponse.json().catch(() => null);

    return Response.json({
      analysisConfigured: true,
      canAnalyze: Boolean(backendResponse.ok && payload?.canAnalyze),
      message: payload?.message || "BeatFirst analysis backend is not ready.",
      backend: payload,
    });
  } catch {
    return Response.json({
      analysisConfigured: true,
      canAnalyze: false,
      message: "BeatFirst analysis backend is configured but not reachable.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
