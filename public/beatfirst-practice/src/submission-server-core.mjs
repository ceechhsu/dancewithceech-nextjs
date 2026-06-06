import { join } from "node:path";

export function isSafeSubmissionId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
}

export function extensionForRecordingMime(mimeType = "") {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4")) return ".mp4";
  if (normalized.includes("quicktime")) return ".mov";
  return ".webm";
}

export function buildSubmissionDirectory(root, submissionId) {
  if (!isSafeSubmissionId(submissionId)) {
    throw new Error("Unsafe submission id");
  }
  return join(root, "edit", "submissions", submissionId);
}

export function parseSubmissionUploadPath(urlPath) {
  const path = (urlPath || "").split("?")[0];
  const match = /^\/api\/submissions\/([^/]+)\/(recording|calibration|metadata)$/.exec(path);
  if (!match) return null;
  const [, submissionId, target] = match;
  if (!isSafeSubmissionId(submissionId)) return null;
  return { submissionId, target };
}

export function parseSubmissionAnalyzePath(urlPath) {
  const path = (urlPath || "").split("?")[0];
  const match = /^\/api\/submissions\/([^/]+)\/analyze$/.exec(path);
  if (!match) return null;
  const [, submissionId] = match;
  if (!isSafeSubmissionId(submissionId)) return null;
  return { submissionId };
}

export function validateSubmissionMetadata(metadata) {
  const errors = [];
  if (!isSafeSubmissionId(metadata?.submissionId)) {
    errors.push("submissionId is required");
  }
  if (typeof metadata?.challengeId !== "string" || metadata.challengeId.length === 0) {
    errors.push("challengeId is required");
  }
  if (!Number.isFinite(metadata?.officialAudioStartTimeSeconds)) {
    errors.push("officialAudioStartTimeSeconds must be a finite number");
  }
  if (!Array.isArray(metadata?.countdownBeeps) || metadata.countdownBeeps.length === 0) {
    errors.push("countdownBeeps must contain at least one beep");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
