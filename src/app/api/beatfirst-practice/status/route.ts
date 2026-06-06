export const dynamic = "force-dynamic";

function hasAnalysisBackend() {
  return Boolean(process.env.BEATFIRST_ANALYSIS_ORIGIN?.trim());
}

export async function GET() {
  const analysisConfigured = hasAnalysisBackend();

  return Response.json({
    analysisConfigured,
    canAnalyze: analysisConfigured,
    message: analysisConfigured
      ? "BeatFirst analysis backend is configured."
      : "BeatFirst analysis backend is not configured for this private beta route.",
  });
}
