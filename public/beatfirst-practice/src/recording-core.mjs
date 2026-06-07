export function roundSeconds(value) {
  return Number(Number(value).toFixed(6));
}

export function buildCountdownSchedule({
  labels = ["3", "2", "1"],
  firstBeepAtSeconds = 0.5,
  intervalSeconds = 1,
} = {}) {
  return labels.map((label, index) => ({
    label,
    scheduledTimeSeconds: roundSeconds(firstBeepAtSeconds + index * intervalSeconds),
  }));
}

export function buildRecordingTimeline({
  challengeDurationSeconds,
  countdownBeeps = buildCountdownSchedule(),
  audioStartDelayAfterLastBeepSeconds = 1,
  postRollSeconds = 1,
}) {
  if (!countdownBeeps.length) {
    throw new Error("At least one countdown beep is required.");
  }

  const lastBeep = countdownBeeps[countdownBeeps.length - 1];
  const officialAudioStartTimeSeconds = roundSeconds(
    lastBeep.scheduledTimeSeconds + audioStartDelayAfterLastBeepSeconds,
  );

  return {
    countdownBeeps,
    officialAudioStartTimeSeconds,
    challengeDurationSeconds: roundSeconds(challengeDurationSeconds),
    postRollSeconds: roundSeconds(postRollSeconds),
    stopRecordingAtSeconds: roundSeconds(
      officialAudioStartTimeSeconds + challengeDurationSeconds + postRollSeconds,
    ),
  };
}

export function formatDemoVideoDownloadProgress({ loadedBytes = 0, totalBytes = 0 } = {}) {
  if (!totalBytes) return "Loading reference video...";
  const percent = Math.min(100, Math.max(0, Math.round((loadedBytes / totalBytes) * 100)));
  return `Loading reference video... ${percent}%`;
}

export function buildPortraitCameraConstraints(requestedFacingMode = "user") {
  return {
    facingMode: { ideal: requestedFacingMode },
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    aspectRatio: { ideal: 9 / 16 },
    resizeMode: { ideal: "none" },
    frameRate: { ideal: 30 },
  };
}

export function buildPortraitCameraConstraintCandidates(requestedFacingMode = "user") {
  const baseConstraints = {
    facingMode: { ideal: requestedFacingMode },
    frameRate: { ideal: 30 },
  };

  return [
    {
      ...baseConstraints,
      width: { ideal: 1080 },
      height: { ideal: 1920 },
      aspectRatio: { exact: 9 / 16 },
      resizeMode: { exact: "none" },
    },
    {
      ...baseConstraints,
      width: { ideal: 720 },
      height: { ideal: 1280 },
      aspectRatio: { exact: 9 / 16 },
      resizeMode: { exact: "none" },
    },
    {
      ...baseConstraints,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 16 / 9 },
      resizeMode: { ideal: "none" },
    },
    buildPortraitCameraConstraints(requestedFacingMode),
  ];
}

export function buildRawMicrophoneAudioConstraints() {
  return {
    echoCancellation: { ideal: false },
    noiseSuppression: { ideal: false },
    autoGainControl: { ideal: false },
  };
}

export function buildSerializableAudioSettings(settings = {}) {
  const allowedKeys = [
    "echoCancellation",
    "noiseSuppression",
    "autoGainControl",
    "sampleRate",
    "sampleSize",
    "channelCount",
    "latency",
  ];
  const serializable = {};

  for (const key of allowedKeys) {
    if (settings[key] !== undefined) serializable[key] = settings[key];
  }

  return serializable;
}

export function buildMinimumZoomConstraint(capabilities = {}) {
  const minimumZoom = Number(capabilities.zoom?.min ?? 0);
  if (!Number.isFinite(minimumZoom) || minimumZoom <= 0) return null;
  return { advanced: [{ zoom: minimumZoom }] };
}

export function getPreviewAspectRatio({
  videoWidth = 0,
  videoHeight = 0,
  settings = {},
  preferPortrait = false,
} = {}) {
  let width = Number(videoWidth || settings.width || 0);
  let height = Number(videoHeight || settings.height || 0);

  if (width > 0 && height > 0) {
    if (preferPortrait && width > height) {
      [width, height] = [height, width];
    }

    return {
      cssAspectRatio: `${width} / ${height}`,
      ratio: width / height,
    };
  }

  return {
    cssAspectRatio: "9 / 16",
    ratio: 9 / 16,
  };
}

export function evaluatePreRecordingReadiness({
  hasCamera = false,
  hasMicrophone = false,
  challengeAudioLoaded = false,
  isPortraitViewport = true,
  cameraSettings = {},
  micCuePeak = null,
  minMicCuePeak = 0.018,
  minFrameRate = 24,
} = {}) {
  const frameRate = Number(cameraSettings.frameRate ?? 0);
  const checks = [
    {
      issue: "challenge-audio-not-ready",
      failed: !challengeAudioLoaded,
      message: "Preparing approved audio.",
      tone: "warning",
    },
    {
      issue: "camera-not-ready",
      failed: !hasCamera,
      message: "Camera is not ready.",
      tone: "error",
    },
    {
      issue: "microphone-not-ready",
      failed: !hasMicrophone,
      message: "Microphone is not ready.",
      tone: "error",
    },
    {
      issue: "phone-not-portrait",
      failed: !isPortraitViewport,
      message: "Hold the phone vertically.",
      tone: "error",
    },
    {
      issue: "frame-rate-too-low",
      failed: Number.isFinite(frameRate) && frameRate > 0 && frameRate < minFrameRate,
      message: "Camera frame rate is too low for accurate scoring.",
      tone: "error",
    },
    {
      issue: "mic-cue-not-checked",
      failed: micCuePeak === null || micCuePeak === undefined,
      message: "Checking microphone audio.",
      tone: "warning",
    },
    {
      issue: "mic-cue-too-quiet",
      failed: Number.isFinite(micCuePeak) && micCuePeak < minMicCuePeak,
      message: "Turn volume up. The mic could not hear the test beat.",
      tone: "error",
    },
  ];
  const failedCheck = checks.find((check) => check.failed);

  if (failedCheck) {
    return {
      canRecord: false,
      state: failedCheck.tone === "error" ? "blocked" : "checking",
      tone: failedCheck.tone,
      message: failedCheck.message,
      issues: [failedCheck.issue],
    };
  }

  return {
    canRecord: true,
    state: "ready",
    tone: "",
    message: "Ready. Stay inside the green border.",
    issues: [],
  };
}

export function getRecordingModeVisibility(mode) {
  const cameraModes = new Set(["preview", "countdown", "recording"]);
  const demoModes = new Set(["library", "detail", "demo"]);
  const isAnalyzing = mode === "analyzing";
  const isUploading = mode === "uploading";
  const isRejected = mode === "rejected";
  const isReview = mode === "review" || mode === "saved" || isAnalyzing;
  const showBackToChallenges = ["detail", "preview", "review", "saved", "rejected"].includes(mode);
  return {
    demoPanel: demoModes.has(mode),
    capturePanel: !demoModes.has(mode),
    demoStatus: mode === "library" || mode === "detail" || mode === "demo",
    captureStatus: !demoModes.has(mode) && !isRejected,
    cameraPreview: cameraModes.has(mode),
    reviewVideo: isReview,
    countdownOverlay: mode === "countdown",
    recordingBadge: mode === "countdown" || mode === "recording",
    cameraStreamActive: cameraModes.has(mode),
    startRecording: mode === "preview",
    switchCamera: false,
    retryRecording: mode === "review" || isRejected,
    submitRecording: false,
    saveToPhone: mode === "review",
    compareSavedTake: mode === "detail",
    analyzeRecording: false,
    analyzingSpinner: isAnalyzing,
    uploadProgress: isUploading || isAnalyzing,
    backToChallenges: showBackToChallenges,
  };
}

export function buildSubmissionRejectionCopy(rejectionMessage = "") {
  const normalized = rejectionMessage.toLowerCase();
  const reason = normalized.includes("tracking")
    || normalized.includes("full body")
    || normalized.includes("feet")
    || normalized.includes("hip")
    ? "Could not detect your full body in the frame."
    : normalized.includes("audio timing")
      || normalized.includes("mic calibration")
      || normalized.includes("headphones")
      || normalized.includes("phone volume")
      ? "Could not verify audio timing. Turn the phone volume up and avoid headphones."
    : "Please record again with your full body and both feet visible.";

  return {
    title: "Submission Rejected",
    reason,
  };
}

export function buildRecordingMediaStream({
  cameraStream,
  microphoneStream,
  mixedAudioStream,
  MediaStreamConstructor = globalThis.MediaStream,
}) {
  if (!MediaStreamConstructor) {
    throw new Error("This browser does not support composed media recording.");
  }
  const audioStream = microphoneStream || mixedAudioStream || cameraStream;

  return new MediaStreamConstructor([
    ...cameraStream.getVideoTracks(),
    ...audioStream.getAudioTracks(),
  ]);
}

export function getRecordingExtension(mimeType = "") {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4")) return ".mp4";
  if (normalized.includes("quicktime")) return ".mov";
  return ".webm";
}

export function getRecordingMimeTypeForFile(file = {}) {
  if (file.type) return file.type;
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  return "video/webm";
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

export function buildSubmissionId(now = new Date()) {
  return [
    "local",
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`,
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`,
    pad(now.getUTCMilliseconds(), 3),
  ].join("-");
}

export function buildSavedTakeFilename({
  challengeId = "",
  mimeType = "",
  now = new Date(),
} = {}) {
  const safeChallengeId = String(challengeId || "dance-take")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "dance-take";
  const date = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
  ].join("");
  const time = [
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join("");

  return `${safeChallengeId}-${date}-${time}${getRecordingExtension(mimeType)}`;
}

export function buildSubmissionMetadata({
  challenge,
  timeline,
  camera = {},
  recording = {},
  calibration = {},
  userAgent = "",
  now = new Date(),
}) {
  const submissionId = buildSubmissionId(now);
  const mimeType = recording.mimeType || "video/webm";

  return {
    submissionId,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    challengeAudio: challenge.challengeAudio,
    demoVideo: challenge.demoVideo,
    beatMapVersion: challenge.beatMapVersion,
    countdownBeeps: timeline.countdownBeeps,
    officialAudioStartTimeSeconds: timeline.officialAudioStartTimeSeconds,
    challengeDurationSeconds: timeline.challengeDurationSeconds,
    postRollSeconds: timeline.postRollSeconds,
    camera: {
      requestedFacingMode: challenge.requestedFacingMode || "user",
      selectedFacingMode: camera.selectedFacingMode || "",
      deviceLabel: camera.deviceLabel || "",
      userSwitchedCamera: Boolean(camera.userSwitchedCamera),
    },
    recording: {
      mimeType,
      extension: recording.extension || getRecordingExtension(mimeType),
      sizeBytes: recording.sizeBytes ?? 0,
      ...(recording.source ? { source: recording.source } : {}),
      ...(recording.fileName ? { fileName: recording.fileName } : {}),
    },
    calibration: calibration.mimeType ? {
      mimeType: calibration.mimeType,
      extension: getRecordingExtension(calibration.mimeType),
      sizeBytes: calibration.sizeBytes ?? 0,
      source: "microphone_only",
      ...(calibration.audioSettings ? { audioSettings: calibration.audioSettings } : {}),
    } : undefined,
    recordedAt: now.toISOString(),
    userAgent,
  };
}
