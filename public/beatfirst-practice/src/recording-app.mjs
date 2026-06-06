import {
  getChallengeById,
  marchingOnBeatChallenge,
} from "./challenge-config.mjs";

import {
  buildMinimumZoomConstraint,
  buildPortraitCameraConstraintCandidates,
  buildRawMicrophoneAudioConstraints,
  buildRecordingMediaStream,
  buildRecordingTimeline,
  buildSavedTakeFilename,
  buildSerializableAudioSettings,
  buildSubmissionMetadata,
  buildSubmissionRejectionCopy,
  evaluatePreRecordingReadiness,
  formatDemoVideoDownloadProgress,
  getRecordingMimeTypeForFile,
  getRecordingModeVisibility,
  getPreviewAspectRatio,
} from "./recording-core.mjs";

const recordShell = document.querySelector("[data-record-shell]");
const demoPanel = document.querySelector("[data-demo-panel]");
const libraryView = document.querySelector("[data-library-view]");
const challengeDetail = document.querySelector("[data-challenge-detail]");
const openChallengeButtons = [...document.querySelectorAll("[data-open-challenge]")];
const challengeDetailTitle = document.querySelector("[data-challenge-detail-title]");
const capturePanel = document.querySelector("[data-capture-panel]");
const demoLoading = document.querySelector("[data-demo-loading]");
const demoVideo = document.querySelector("[data-demo-video]");
const tryThis = document.querySelector("[data-try-this]");
const compareSavedTake = document.querySelector("[data-compare-saved-take]");
const savedTakeInput = document.querySelector("[data-saved-take-input]");
const recordStage = document.querySelector("[data-record-stage]");
const cameraPreview = document.querySelector("[data-camera-preview]");
const reviewVideo = document.querySelector("[data-review-video]");
const safeFrame = document.querySelector("[data-safe-frame]");
const startRecording = document.querySelector("[data-start-recording]");
const retryRecording = document.querySelector("[data-retry-recording]");
const saveToPhone = document.querySelector("[data-save-to-phone]");
const backToChallenges = [...document.querySelectorAll("[data-back-to-challenges]")];
const countdownOverlay = document.querySelector("[data-countdown-overlay]");
const recordingBadge = document.querySelector("[data-recording-badge]");
const analyzingSpinner = document.querySelector("[data-analyzing-spinner]");
const uploadProgress = document.querySelector("[data-upload-progress]");
const uploadProgressLabel = document.querySelector("[data-upload-progress-label]");
const uploadProgressPercent = document.querySelector("[data-upload-progress-percent]");
const uploadProgressBar = document.querySelector("[data-upload-progress-bar]");
const demoStatus = document.querySelector("[data-demo-recording-status]");
const captureStatus = document.querySelector("[data-capture-recording-status]");
const savedLinks = document.querySelector("[data-saved-links]");
const DEMO_VIDEO_CACHE_NAME = "dancewithceech-reference-v2";
const RECORD_CAPTURE_CONTROLS_SPACE = 156;

let mediaStream = null;
let mediaRecorder = null;
let micCalibrationRecorder = null;
let audioContext = null;
let challengeAudioBuffer = null;
let recordingAudioDestination = null;
let microphoneAudioSource = null;
let selectedCameraLabel = "";
let selectedFacingMode = "";
let selectedMicAudioSettings = {};
let selectedCameraSettings = {};
let readinessCuePeak = null;
let readinessState = evaluatePreRecordingReadiness();
let readinessRecheckTimer = null;
let demoVideoBlobUrl = "";
let demoVideoLoadPromise = null;
let demoVideoReady = false;
let recordingChunks = [];
let micCalibrationChunks = [];
let reviewBlob = null;
let micCalibrationBlob = null;
let micCalibrationStopPromise = null;
let reviewUrl = "";
let savedSubmissionId = "";
let currentPreviewAspectRatio = 9 / 16;
let activeChallenge = marchingOnBeatChallenge;
let timeline = buildTimelineForChallenge(activeChallenge);
let stopTimer = null;
let countdownTimers = [];

function buildTimelineForChallenge(challenge) {
  return buildRecordingTimeline({
    challengeDurationSeconds: challenge.challengeDurationSeconds,
    postRollSeconds: challenge.postRollSeconds,
  });
}

function isViewportPortrait() {
  return window.matchMedia?.("(orientation: portrait)")?.matches
    ?? window.innerHeight >= window.innerWidth;
}

function setStatus(message, tone = "") {
  for (const statusOutput of [demoStatus, captureStatus]) {
    statusOutput.textContent = message;
    statusOutput.classList.toggle("warning", tone === "warning");
    statusOutput.classList.toggle("error", tone === "error");
  }
}

function setActiveChallenge(challenge) {
  if (!challenge || challenge.id === activeChallenge.id) {
    if (challengeDetailTitle) challengeDetailTitle.textContent = activeChallenge.title;
    return;
  }

  releaseDemoVideoCache();
  clearReview();
  challengeAudioBuffer = null;
  savedSubmissionId = "";
  activeChallenge = challenge;
  timeline = buildTimelineForChallenge(activeChallenge);
  if (challengeDetailTitle) challengeDetailTitle.textContent = activeChallenge.title;
}

function clearCountdownTimers() {
  for (const timer of countdownTimers) window.clearTimeout(timer);
  countdownTimers = [];
}

function clearReadinessRecheckTimer() {
  window.clearTimeout(readinessRecheckTimer);
  readinessRecheckTimer = null;
}

function resetReadiness() {
  clearReadinessRecheckTimer();
  readinessCuePeak = null;
  selectedCameraSettings = {};
  readinessState = evaluatePreRecordingReadiness();
  recordStage.dataset.readiness = readinessState.state;
}

function clearReview() {
  if (reviewUrl) URL.revokeObjectURL(reviewUrl);
  reviewBlob = null;
  micCalibrationBlob = null;
  micCalibrationChunks = [];
  micCalibrationStopPromise = null;
  reviewUrl = "";
  reviewVideo.muted = false;
  reviewVideo.removeAttribute("src");
  reviewVideo.load();
}

function releaseDemoVideoCache() {
  if (demoVideoBlobUrl) URL.revokeObjectURL(demoVideoBlobUrl);
  demoVideoBlobUrl = "";
  demoVideoLoadPromise = null;
  demoVideoReady = false;
  demoVideo.removeAttribute("src");
  demoVideo.load();
  setDemoVideoLoadingState();
}

function setDemoVideoLoadingState({ ready = false, message = "Loading reference video..." } = {}) {
  demoVideoReady = ready;
  demoLoading.textContent = message;
  demoLoading.hidden = ready;
  demoVideo.hidden = !ready;
  tryThis.disabled = !ready;
}

async function readResponseBlobWithProgress(response, { showProgress = true } = {}) {
  const totalBytes = Number(response.headers.get("content-length") || 0);
  const contentType = response.headers.get("content-type") || "video/mp4";

  if (!showProgress) return response.blob();

  if (!response.body?.getReader) {
    setDemoVideoLoadingState({ message: formatDemoVideoDownloadProgress({ loadedBytes: 0, totalBytes }) });
    return response.blob();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loadedBytes = 0;
  setDemoVideoLoadingState({
    message: formatDemoVideoDownloadProgress({ loadedBytes, totalBytes }),
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    setDemoVideoLoadingState({
      message: formatDemoVideoDownloadProgress({ loadedBytes, totalBytes }),
    });
  }

  return new Blob(chunks, { type: contentType });
}

function waitForDemoVideoMetadata() {
  if (demoVideo.readyState >= 1) return Promise.resolve();

  return new Promise((resolveWait, rejectWait) => {
    const cleanup = () => {
      demoVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
      demoVideo.removeEventListener("error", handleError);
    };
    const handleLoadedMetadata = () => {
      cleanup();
      resolveWait();
    };
    const handleError = () => {
      cleanup();
      rejectWait(new Error("Reference video could not be prepared. Please refresh and try again."));
    };

    demoVideo.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    demoVideo.addEventListener("error", handleError, { once: true });
  });
}

function storeDemoVideoBlob(cache, request, videoBlob) {
  if (!cache || !request || !videoBlob?.size) return;
  const cachedResponse = new Response(videoBlob, {
    headers: {
      "Content-Type": videoBlob.type || "video/mp4",
    },
  });
  void cache.put(request, cachedResponse).catch(() => {});
}

async function getDemoVideoResponse(url) {
  const request = new Request(url);
  if (!("caches" in window)) {
    return {
      response: await fetch(request),
      fromCache: false,
      cache: null,
      request: null,
    };
  }

  try {
    const cache = await caches.open(DEMO_VIDEO_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return {
        response: cached,
        fromCache: true,
        cache,
        request,
      };
    }

    const response = await fetch(request);
    return {
      response,
      fromCache: false,
      cache,
      request,
    };
  } catch {
    return {
      response: await fetch(request),
      fromCache: false,
      cache: null,
      request: null,
    };
  }
}

async function loadDemoVideoIntoBrowserCache() {
  if (demoVideoReady) return;
  if (demoVideoLoadPromise) return demoVideoLoadPromise;

  setDemoVideoLoadingState();
  demoVideo.removeAttribute("src");
  demoVideo.load();

  demoVideoLoadPromise = (async () => {
    const { response, fromCache, cache, request } = await getDemoVideoResponse(activeChallenge.demoVideo);
    if (!response.ok) throw new Error(`Could not load reference video: ${response.status}`);
    if (fromCache) {
      setDemoVideoLoadingState({ message: "Restoring reference video from browser cache..." });
    }

    const videoBlob = await readResponseBlobWithProgress(response, { showProgress: !fromCache });
    if (demoVideoBlobUrl) URL.revokeObjectURL(demoVideoBlobUrl);
    demoVideoBlobUrl = URL.createObjectURL(videoBlob);
    demoVideo.src = demoVideoBlobUrl;
    demoVideo.load();
    await waitForDemoVideoMetadata();
    setDemoVideoLoadingState({ ready: true, message: "Reference video ready." });
    storeDemoVideoBlob(cache, request, videoBlob);
  })();

  try {
    await demoVideoLoadPromise;
  } catch (error) {
    demoVideoLoadPromise = null;
    setDemoVideoLoadingState({
      ready: false,
      message: error.message || "Could not load reference video.",
    });
    throw error;
  }
}

function clearRecordingAudioGraph() {
  if (microphoneAudioSource) {
    microphoneAudioSource.disconnect();
  }
  microphoneAudioSource = null;
  recordingAudioDestination = null;
}

function scheduleReadinessCue(startTime) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1040, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.26, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.18);
  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    gain.disconnect();
  }, { once: true });
}

async function measureMicrophoneCuePeak({ durationMs = 620 } = {}) {
  if (!audioContext || !mediaStream?.getAudioTracks?.().length) return 0;
  const micSource = audioContext.createMediaStreamSource(new MediaStream([...mediaStream.getAudioTracks()]));
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  const samples = new Float32Array(analyser.fftSize);
  let peak = 0;

  micSource.connect(analyser);
  scheduleReadinessCue(audioContext.currentTime + 0.06);

  await new Promise((resolveWait) => {
    const startedAt = performance.now();
    const sample = () => {
      analyser.getFloatTimeDomainData(samples);
      for (const value of samples) peak = Math.max(peak, Math.abs(value));
      if (performance.now() - startedAt >= durationMs) resolveWait();
      else window.requestAnimationFrame(sample);
    };
    sample();
  });

  micSource.disconnect();
  analyser.disconnect();
  return peak;
}

async function runPreRecordingReadinessCheck() {
  clearReadinessRecheckTimer();
  readinessCuePeak = null;
  refreshPreRecordingReadiness();
  if (!mediaStream || !challengeAudioBuffer) return readinessState;

  try {
    await audioContext.resume();
    readinessCuePeak = await measureMicrophoneCuePeak();
  } catch {
    readinessCuePeak = 0;
  }

  const result = refreshPreRecordingReadiness();
  if (!result.canRecord && result.issues.includes("mic-cue-too-quiet") && recordShell.dataset.mode === "preview") {
    readinessRecheckTimer = window.setTimeout(() => {
      if (recordShell.dataset.mode === "preview") void runPreRecordingReadinessCheck();
    }, 3500);
  }
  return result;
}

function connectToPlaybackAndRecording(node) {
  node.connect(audioContext.destination);
  if (recordingAudioDestination) node.connect(recordingAudioDestination);
}

function setMode(mode) {
  const visibility = getRecordingModeVisibility(mode);
  if (!visibility.cameraStreamActive) stopCurrentStream();
  recordShell.dataset.mode = mode;
  document.body.dataset.recordMode = mode;
  demoPanel.hidden = !visibility.demoPanel;
  libraryView.hidden = mode !== "library";
  challengeDetail.hidden = mode !== "detail";
  capturePanel.hidden = !visibility.capturePanel;
  recordStage.hidden = mode === "rejected" || mode === "uploading";
  demoStatus.hidden = !visibility.demoStatus;
  captureStatus.hidden = !visibility.captureStatus;
  cameraPreview.hidden = !visibility.cameraPreview;
  reviewVideo.hidden = !visibility.reviewVideo;
  countdownOverlay.hidden = !visibility.countdownOverlay;
  if (!visibility.countdownOverlay) countdownOverlay.textContent = "";
  recordingBadge.hidden = !visibility.recordingBadge;
  startRecording.hidden = !visibility.startRecording;
  startRecording.disabled = mode !== "preview" || !readinessState.canRecord;
  retryRecording.hidden = !visibility.retryRecording;
  retryRecording.textContent = "Retry";
  saveToPhone.hidden = !visibility.saveToPhone;
  compareSavedTake.hidden = !visibility.compareSavedTake;
  for (const button of backToChallenges) button.hidden = !visibility.backToChallenges;
  analyzingSpinner.hidden = !visibility.analyzingSpinner;
  uploadProgress.hidden = !visibility.uploadProgress;
  safeFrame.hidden = !(mode === "preview" || mode === "countdown" || mode === "recording");

  if (mode !== "library" && mode !== "detail" && mode !== "demo") {
    demoVideo.pause();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function refreshPreRecordingReadiness({ updateStatus = true } = {}) {
  const hasCamera = Boolean(mediaStream?.getVideoTracks?.().some((track) => track.readyState === "live"));
  const hasMicrophone = Boolean(mediaStream?.getAudioTracks?.().some((track) => track.readyState === "live"));
  readinessState = evaluatePreRecordingReadiness({
    hasCamera,
    hasMicrophone,
    challengeAudioLoaded: Boolean(challengeAudioBuffer),
    isPortraitViewport: isViewportPortrait(),
    cameraSettings: selectedCameraSettings,
    micCuePeak: readinessCuePeak,
  });
  recordStage.dataset.readiness = readinessState.state;
  startRecording.disabled = recordShell.dataset.mode !== "preview" || !readinessState.canRecord;
  if (updateStatus && recordShell.dataset.mode === "preview") {
    setStatus(readinessState.message, readinessState.tone);
  }
  return readinessState;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSubmissionRejection(rejectionMessage) {
  const copy = buildSubmissionRejectionCopy(rejectionMessage);
  retryRecording.disabled = false;
  setMode("rejected");
  savedLinks.innerHTML = `
    <section class="rejection-card" role="alert" aria-label="Submission Rejected">
      <h1>${escapeHtml(copy.title)}</h1>
      <p><strong>Reason:</strong> ${escapeHtml(copy.reason)}</p>
    </section>
  `;
  savedLinks.hidden = false;
  setStatus(copy.reason, "error");
}

function getPreferredMimeType() {
  if (!("MediaRecorder" in window)) return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

function getPreferredCalibrationMimeType() {
  if (!("MediaRecorder" in window)) return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

async function loadChallengeAudio() {
  if (challengeAudioBuffer) return challengeAudioBuffer;
  audioContext ||= new AudioContext();
  const response = await fetch(activeChallenge.challengeAudio);
  if (!response.ok) throw new Error(`Could not load challenge audio: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  challengeAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  timeline = buildRecordingTimeline({
    challengeDurationSeconds: challengeAudioBuffer.duration,
    postRollSeconds: activeChallenge.postRollSeconds,
  });
  return challengeAudioBuffer;
}

function stopCurrentStream() {
  resetReadiness();
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
  }
  mediaStream = null;
  cameraPreview.srcObject = null;
}

function applyRecordStageAspectRatio(videoElement, settings = {}) {
  const aspect = getPreviewAspectRatio({
    videoWidth: videoElement.videoWidth,
    videoHeight: videoElement.videoHeight,
    settings,
    preferPortrait: isViewportPortrait(),
  });
  const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
  const maxPreviewWidth = Math.max(0, viewportHeight - RECORD_CAPTURE_CONTROLS_SPACE) * aspect.ratio;
  currentPreviewAspectRatio = aspect.ratio;
  recordStage.style.setProperty("--record-preview-aspect-ratio", aspect.cssAspectRatio);
  recordStage.style.setProperty("--record-preview-ratio", String(aspect.ratio));
  recordStage.style.setProperty("--record-preview-max-width", `${maxPreviewWidth}px`);
}

function syncRecordStageAspectWhenReady(videoElement, settings = {}) {
  applyRecordStageAspectRatio(videoElement, settings);
  videoElement.addEventListener(
    "loadedmetadata",
    () => applyRecordStageAspectRatio(videoElement, settings),
    { once: true },
  );
}

function refreshRecordStageMaxWidth() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
  const maxPreviewWidth = Math.max(0, viewportHeight - RECORD_CAPTURE_CONTROLS_SPACE) * currentPreviewAspectRatio;
  recordStage.style.setProperty("--record-preview-max-width", `${maxPreviewWidth}px`);
}

function handleViewportResize() {
  refreshRecordStageMaxWidth();
  if (recordShell.dataset.mode === "preview") refreshPreRecordingReadiness();
}

function prepareRecordingAudioDestination() {
  clearRecordingAudioGraph();
  recordingAudioDestination = audioContext.createMediaStreamDestination();
  if (mediaStream.getAudioTracks().length) {
    microphoneAudioSource = audioContext.createMediaStreamSource(mediaStream);
    microphoneAudioSource.connect(recordingAudioDestination);
  }
  return recordingAudioDestination;
}

function isPermissionDenied(error) {
  return error?.name === "NotAllowedError" || error?.name === "SecurityError";
}

async function getCameraStreamWithPortraitFallback(requestedFacingMode) {
  const cameraConstraintCandidates = buildPortraitCameraConstraintCandidates(requestedFacingMode);
  const audioConstraints = buildRawMicrophoneAudioConstraints();
  let lastError = null;

  for (const videoConstraints of cameraConstraintCandidates) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
    } catch (error) {
      lastError = error;
      if (isPermissionDenied(error)) throw error;
    }
  }

  throw lastError || new Error("This browser could not open the camera.");
}

async function applyMinimumCameraZoom(videoTrack) {
  const capabilities = videoTrack?.getCapabilities?.() || {};
  const minimumZoomConstraint = buildMinimumZoomConstraint(capabilities);
  if (!minimumZoomConstraint || !videoTrack?.applyConstraints) return capabilities;

  try {
    await videoTrack.applyConstraints(minimumZoomConstraint);
  } catch {
    // Some mobile browsers report zoom but reject applying it. Keep the stream.
  }

  return capabilities;
}

async function openCamera() {
  if (!window.isSecureContext) {
    throw new Error("Camera recording requires HTTPS. Use the secure phone URL.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support camera recording.");
  }

  stopCurrentStream();
  mediaStream = await getCameraStreamWithPortraitFallback(activeChallenge.requestedFacingMode);

  cameraPreview.srcObject = mediaStream;
  const videoTrack = mediaStream.getVideoTracks()[0];
  await applyMinimumCameraZoom(videoTrack);
  const settings = videoTrack?.getSettings?.() || {};
  selectedCameraSettings = settings;
  const audioTrack = mediaStream.getAudioTracks()[0];
  selectedMicAudioSettings = buildSerializableAudioSettings(audioTrack?.getSettings?.() || {});
  selectedFacingMode = settings.facingMode || "";
  selectedCameraLabel = videoTrack?.label || "";
  syncRecordStageAspectWhenReady(cameraPreview, settings);
  refreshPreRecordingReadiness({ updateStatus: false });
  setMode("preview");
}

async function handleTryThis() {
  try {
    setStatus("Preparing camera and challenge audio...");
    await Promise.all([
      openCamera(),
      loadChallengeAudio(),
    ]);
    await runPreRecordingReadinessCheck();
  } catch (error) {
    stopCurrentStream();
    setMode("detail");
    setStatus(error.message, "error");
  }
}

function handleOpenChallenge(challenge = activeChallenge) {
  setActiveChallenge(challenge);
  setMode("detail");
  setStatus("Review the challenge, then tap Try This.");
  loadDemoVideoIntoBrowserCache().catch(() => {});
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getRequestedChallengeId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("challenge") || "";
}

function openRequestedChallengeFromUrl() {
  const requestedChallengeId = getRequestedChallengeId();
  const requestedChallenge = getChallengeById(requestedChallengeId);
  if (requestedChallenge) {
    handleOpenChallenge(requestedChallenge);
    return true;
  }
  return false;
}

function scheduleBeep(startTime) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
  oscillator.connect(gain);
  connectToPlaybackAndRecording(gain);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.2);
}

function scheduleChallengeAudio(startTime) {
  const source = audioContext.createBufferSource();
  source.buffer = challengeAudioBuffer;
  connectToPlaybackAndRecording(source);
  source.start(startTime);
  return source;
}

function scheduleVisualCountdown() {
  clearCountdownTimers();
  countdownOverlay.hidden = false;
  for (const beep of timeline.countdownBeeps) {
    countdownTimers.push(window.setTimeout(() => {
      countdownOverlay.textContent = beep.label;
      countdownOverlay.hidden = false;
    }, beep.scheduledTimeSeconds * 1000));
  }
  countdownTimers.push(window.setTimeout(() => {
    countdownOverlay.textContent = "Go";
  }, timeline.officialAudioStartTimeSeconds * 1000));
  countdownTimers.push(window.setTimeout(() => {
    countdownOverlay.hidden = true;
    setMode("recording");
  }, (timeline.officialAudioStartTimeSeconds + 0.5) * 1000));
}

function waitForRecorderStart(recorder) {
  if (recorder.state === "recording") return Promise.resolve();
  return new Promise((resolveWait, rejectWait) => {
    const timeout = window.setTimeout(() => {
      if (recorder.state === "recording") resolveWait();
      else rejectWait(new Error("Recorder did not start."));
    }, 1000);
    recorder.addEventListener("start", () => {
      window.clearTimeout(timeout);
      resolveWait();
    }, { once: true });
  });
}

async function handleStartRecording() {
  if (!mediaStream) return;
  if (!readinessState.canRecord) {
    await runPreRecordingReadinessCheck();
    if (!readinessState.canRecord) return;
  }
  if (!("MediaRecorder" in window)) {
    setStatus("This browser does not support MediaRecorder.", "error");
    return;
  }

  clearReview();
  clearReadinessRecheckTimer();
  savedLinks.hidden = true;
  savedLinks.innerHTML = "";
  savedSubmissionId = "";
  clearCountdownTimers();
  window.clearTimeout(stopTimer);
  await loadChallengeAudio();
  await audioContext.resume();

  recordingChunks = [];
  micCalibrationChunks = [];
  micCalibrationBlob = null;
  micCalibrationStopPromise = null;
  const mimeType = getPreferredMimeType();
  const options = mimeType ? { mimeType } : {};
  prepareRecordingAudioDestination();
  const recordingStream = buildRecordingMediaStream({
    cameraStream: mediaStream,
    microphoneStream: mediaStream,
  });
  mediaRecorder = new MediaRecorder(recordingStream, options);
  const micCalibrationStream = new MediaStream([...mediaStream.getAudioTracks()]);
  const calibrationMimeType = getPreferredCalibrationMimeType();
  const calibrationOptions = calibrationMimeType ? { mimeType: calibrationMimeType } : {};
  micCalibrationRecorder = new MediaRecorder(micCalibrationStream, calibrationOptions);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) recordingChunks.push(event.data);
  });
  mediaRecorder.addEventListener("stop", handleRecordingStop, { once: true });
  micCalibrationRecorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) micCalibrationChunks.push(event.data);
  });
  micCalibrationStopPromise = new Promise((resolveStop) => {
    micCalibrationRecorder.addEventListener("stop", () => {
      const type = micCalibrationRecorder?.mimeType || calibrationMimeType || "audio/webm";
      micCalibrationBlob = new Blob(micCalibrationChunks, { type });
      resolveStop(micCalibrationBlob);
    }, { once: true });
  });

  try {
    mediaRecorder.start();
    micCalibrationRecorder.start();
    await Promise.all([
      waitForRecorderStart(mediaRecorder),
      waitForRecorderStart(micCalibrationRecorder),
    ]);
    setMode("countdown");
    setStatus("Recording started. Listen for the countdown beeps.");

    const startAt = audioContext.currentTime;
    for (const beep of timeline.countdownBeeps) {
      scheduleBeep(startAt + beep.scheduledTimeSeconds);
    }
    scheduleChallengeAudio(startAt + timeline.officialAudioStartTimeSeconds);
    scheduleVisualCountdown();

    stopTimer = window.setTimeout(() => {
      if (mediaRecorder?.state === "recording") mediaRecorder.stop();
      if (micCalibrationRecorder?.state === "recording") micCalibrationRecorder.stop();
    }, timeline.stopRecordingAtSeconds * 1000);
  } catch (error) {
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    if (micCalibrationRecorder?.state === "recording") micCalibrationRecorder.stop();
    clearRecordingAudioGraph();
    setMode("preview");
    setStatus(error.message, "error");
  }
}

async function handleRecordingStop() {
  window.clearTimeout(stopTimer);
  clearCountdownTimers();
  if (micCalibrationRecorder?.state === "recording") micCalibrationRecorder.stop();
  if (micCalibrationStopPromise) await micCalibrationStopPromise;
  clearRecordingAudioGraph();
  countdownOverlay.hidden = true;
  const mimeType = mediaRecorder?.mimeType || getPreferredMimeType() || "video/webm";
  reviewBlob = new Blob(recordingChunks, { type: mimeType });
  reviewUrl = URL.createObjectURL(reviewBlob);
  reviewVideo.src = reviewUrl;
  reviewVideo.muted = false;
  syncRecordStageAspectWhenReady(reviewVideo);
  reviewVideo.load();
  setMode("review");
  setStatus("Review your take.");
}

async function handleRetry() {
  clearReview();
  savedLinks.hidden = true;
  savedLinks.innerHTML = "";
  savedSubmissionId = "";
  setStatus("Previous take discarded locally. Preparing camera...");
  try {
    await openCamera();
    await runPreRecordingReadinessCheck();
  } catch (error) {
    setMode("library");
    setStatus(error.message, "error");
  }
}

function resetToChallengeLibrary() {
  window.clearTimeout(stopTimer);
  clearCountdownTimers();
  clearReadinessRecheckTimer();
  clearRecordingAudioGraph();
  stopCurrentStream();
  clearReview();
  savedLinks.hidden = true;
  savedLinks.innerHTML = "";
  savedSubmissionId = "";
  retryRecording.disabled = false;
  demoVideo.pause();
  setUploadProgress({ label: "Preparing upload", percent: 0, updateStatus: false });
  setMode("library");
  setStatus("Choose a challenge to begin.");
}

function setUploadProgress({ label, percent, updateStatus = true }) {
  const safePercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  uploadProgressLabel.textContent = label;
  uploadProgressPercent.textContent = `${safePercent}%`;
  uploadProgressBar.value = safePercent;
  if (updateStatus) setStatus(`${label}... ${safePercent}%`);
}

function parseUploadResponse(xhr) {
  try {
    return JSON.parse(xhr.responseText || "{}");
  } catch {
    return {};
  }
}

function uploadRequest(url, { body, contentType, onProgress } = {}) {
  return new Promise((resolveUpload, rejectUpload) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    });
    xhr.addEventListener("load", () => {
      const responsePayload = parseUploadResponse(xhr);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1, 1);
        resolveUpload(responsePayload);
        return;
      }
      rejectUpload(new Error(responsePayload.error || `Upload failed with ${xhr.status}`));
    });
    xhr.addEventListener("error", () => {
      rejectUpload(new Error("Upload failed. Connection was interrupted. Please try again."));
    });
    xhr.addEventListener("timeout", () => {
      rejectUpload(new Error("Upload failed. Connection timed out. Please try again."));
    });
    xhr.send(body);
  });
}

async function uploadJson(url, payload, { label = "Finalizing upload", onProgress } = {}) {
  return uploadRequest(url, {
    contentType: "application/json",
    body: JSON.stringify(payload),
    onProgress,
    label,
  });
}

async function uploadBlob(url, blob, { label = "Uploading file", onProgress, contentType = "" } = {}) {
  return uploadRequest(url, {
    contentType: contentType || blob.type || "video/webm",
    body: blob,
    onProgress,
    label,
  });
}

function buildPhaseUploadProgress({ label, startPercent, spanPercent }) {
  return (loadedBytes = 0, totalBytes = 1) => {
    const total = Number(totalBytes) || 1;
    const loaded = Math.min(total, Math.max(0, Number(loadedBytes) || 0));
    setUploadProgress({
      label,
      percent: startPercent + (spanPercent * loaded) / total,
    });
  };
}

function handleCompareSavedTake() {
  savedTakeInput.value = "";
  savedTakeInput.click();
}

async function uploadSelectedSavedTake(file) {
  const mimeType = getRecordingMimeTypeForFile(file);
  const metadata = buildSubmissionMetadata({
    challenge: activeChallenge,
    timeline,
    camera: {
      selectedFacingMode: "",
      deviceLabel: "",
      userSwitchedCamera: false,
    },
    recording: {
      mimeType,
      sizeBytes: file.size,
      source: "saved_phone_take",
      fileName: file.name || "",
    },
    userAgent: navigator.userAgent,
  });

  try {
    savedSubmissionId = metadata.submissionId;
    setMode("uploading");
    setUploadProgress({ label: "Preparing saved take", percent: 0 });
    const baseUrl = `/api/beatfirst-practice/submissions/${metadata.submissionId}`;
    await uploadBlob(`${baseUrl}/recording`, file, {
      contentType: mimeType,
      label: "Uploading saved take",
      onProgress: buildPhaseUploadProgress({
        label: "Uploading saved take",
        startPercent: 0,
        spanPercent: 92,
      }),
    });
    await uploadJson(`${baseUrl}/metadata`, metadata, {
      label: "Finalizing upload",
      onProgress: buildPhaseUploadProgress({
        label: "Finalizing upload",
        startPercent: 92,
        spanPercent: 8,
      }),
    });
    setUploadProgress({ label: "Starting analysis", percent: 100 });
    await analyzeSavedSubmission();
  } catch (error) {
    savedSubmissionId = "";
    setMode("detail");
    setStatus(error.message, "error");
  }
}

async function handleSavedTakeSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await uploadSelectedSavedTake(file);
  savedTakeInput.value = "";
}

function handleSaveToPhone() {
  if (!reviewBlob) return;
  const downloadUrl = URL.createObjectURL(reviewBlob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = buildSavedTakeFilename({
    challengeId: activeChallenge.id,
    mimeType: reviewBlob.type || "video/webm",
  });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10_000);
  clearReview();
  setMode("detail");
  setStatus("Saved to phone. Choose Analyze Saved Take when ready.");
}

async function analyzeSavedSubmission() {
  if (!savedSubmissionId) return;
  setMode("analyzing");
  setStatus("Analyzing video. Checking full-body framing and foot contacts...");

  try {
    const response = await fetch(`/api/beatfirst-practice/submissions/${savedSubmissionId}/analyze`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Analysis failed with ${response.status}`);
    }

    if (payload.rejected) {
      renderSubmissionRejection(payload.rejectionMessage);
      return;
    }

    window.location.href = payload.playerUrl;
  } catch (error) {
    renderSubmissionRejection(error.message);
  }
}

function bindEvents() {
  for (const button of openChallengeButtons) {
    button.addEventListener("click", () => {
      handleOpenChallenge(getChallengeById(button.dataset.challengeId) || activeChallenge);
    });
  }
  tryThis.addEventListener("click", handleTryThis);
  startRecording.addEventListener("click", handleStartRecording);
  retryRecording.addEventListener("click", handleRetry);
  saveToPhone.addEventListener("click", handleSaveToPhone);
  compareSavedTake.addEventListener("click", handleCompareSavedTake);
  savedTakeInput.addEventListener("change", handleSavedTakeSelected);
  for (const button of backToChallenges) button.addEventListener("click", resetToChallengeLibrary);
  window.addEventListener("resize", handleViewportResize);
  window.visualViewport?.addEventListener("resize", handleViewportResize);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) resetToChallengeLibrary();
  });
  window.addEventListener("pagehide", () => {
    clearRecordingAudioGraph();
    stopCurrentStream();
    clearReview();
    releaseDemoVideoCache();
  });
}

function init() {
  setDemoVideoLoadingState();
  bindEvents();
  if (!openRequestedChallengeFromUrl()) {
    setMode("library");
    setStatus("Choose a challenge to begin.");
  }
}

init();
