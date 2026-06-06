import {
  detectContacts,
  getActiveContactLabel,
} from "./contact-core.mjs";

import {
  analyzePoseQuality,
  formatPoseQualityRejection,
} from "./pose-quality-core.mjs";

import {
  buildBeatGrid,
  buildBeatTimingScore,
  buildReferenceContactTimingScore,
  formatTime,
  getAdjacentBeatTime,
  getAdjacentReferenceContactTime,
  getActiveBeatLabel,
  getAnalysisFrameRange,
  getBeatsInTimeRange,
  getContainRect,
  getNearestBeat,
  getNearestFrame,
  getReferenceContactAnalysisFrameRange,
  getReferenceContactTimelineEntries,
  getReferenceGhostComparisonBeats,
  getReferenceGhostPlaybackTime,
  mapNormalizedPointToCanvas,
  resolveAnalysisAssets,
  stepFrame,
} from "./player-core.mjs";

import { getChallengeById } from "./challenge-config.mjs";

const video = document.querySelector("[data-video]");
const videoStage = document.querySelector(".video-stage");
const appShell = document.querySelector(".app-shell");
const referenceGhostVideo = document.querySelector("[data-reference-ghost-video]");
const analysisLoading = document.querySelector("[data-analysis-loading]");
const playToggle = document.querySelector("[data-play-toggle]");
const prevFrame = document.querySelector("[data-prev-frame]");
const nextFrame = document.querySelector("[data-next-frame]");
const prevBeat = document.querySelector("[data-prev-beat]");
const nextBeat = document.querySelector("[data-next-beat]");
const timeline = document.querySelector("[data-timeline]");
const currentTimeOutput = document.querySelector("[data-current-time]");
const currentFrameOutput = document.querySelector("[data-current-frame]");
const activeBeatTitle = document.querySelector("[data-active-beat-title]");
const activeBeatOutput = document.querySelector("[data-active-beat]");
const activeContactOutput = document.querySelector("[data-active-contact]");
const nearestBeatTitle = document.querySelector("[data-nearest-beat-title]");
const nearestBeatOutput = document.querySelector("[data-nearest-beat]");
const beatOverlay = document.querySelector("[data-beat-overlay]");
const contactOverlay = document.querySelector("[data-contact-overlay]");
const reviewScorePrompt = document.querySelector("[data-review-score-prompt]");
const beatRail = document.querySelector("[data-beat-rail]");
const poseCanvas = document.querySelector("[data-pose-canvas]");
const waveformOverlay = document.querySelector("[data-waveform-overlay]");
const waveformImage = document.querySelector("[data-waveform-image]");
const waveformPlayhead = document.querySelector("[data-waveform-playhead]");
const waveformToggle = document.querySelector("[data-toggle-waveform]");
const waveformToggleWrap = document.querySelector("[data-waveform-toggle-wrap]");
const beatToggle = document.querySelector("[data-toggle-beats]");
const beatToggleLabel = document.querySelector("[data-beat-toggle-label]");
const poseToggle = document.querySelector("[data-toggle-pose]");
const referenceGhostToggle = document.querySelector("[data-toggle-reference-ghost]");
const referenceGhostToggleWrap = document.querySelector("[data-reference-ghost-toggle-wrap]");
const timingTable = document.querySelector("[data-timing-table]");
const scoreSummary = document.querySelector("[data-score-summary]");
const timingPanel = document.querySelector(".timing-panel");
const timingHeading = document.querySelector(".timing-panel h2");
const timingDescription = document.querySelector(".timing-panel p");
const timingHeaderCells = [...document.querySelectorAll(".timing-panel thead th")];
const statusOutput = document.querySelector("[data-status]");
const setRangeStart = document.querySelector("[data-set-range-start]");
const setRangeEnd = document.querySelector("[data-set-range-end]");
const analyzeRange = document.querySelector("[data-analyze-range]");
const rangePanel = document.querySelector("[data-range-panel]");
const rangePrompt = document.querySelector("[data-range-prompt]");
const rangeStartOutput = document.querySelector("[data-range-start]");
const rangeEndOutput = document.querySelector("[data-range-end]");
const rangeDurationOutput = document.querySelector("[data-range-duration]");
const beatPhaseOutput = document.querySelector("[data-beat-phase]");
const tryAgain = document.querySelector("[data-try-again]");
const chooseAnother = document.querySelector("[data-choose-another]");

const WAVEFORM_HEIGHT_RATIO = 0.2;
const WAVEFORM_MIN_HEIGHT = 72;
const WAVEFORM_MAX_HEIGHT = 168;
const REFERENCE_GHOST_RESULT_MODE = "marching-reference-ghost-v1";
const REFERENCE_GHOST_FORCE_SYNC_TOLERANCE_SECONDS = 0.02;
const REFERENCE_GHOST_PLAYBACK_SYNC_TOLERANCE_SECONDS = 0.15;
const LOWER_BODY_OVERLAY_LANDMARKS = new Set([
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_front_foot",
  "right_front_foot",
]);

let beatData = { fps: 60, frame_count: 0, duration_seconds: 0, beats: [] };
let poseData = { width: 1080, height: 1920, frames: [], connections: [] };
let referenceContactData = { fps: 60, frame_count: 0, contacts: [] };
let contacts = [];
let poseQuality = { rejected: false, issues: [] };
let analysisRange = { startSeconds: null, endSeconds: null };
let analysisCompleted = false;
let analysisDataLoaded = false;
let playerAnalysisReady = false;
let scoredBeats = [];
let beatGrid = null;
let analysisAssets = resolveAnalysisAssets();
let sourcePoseAsset = analysisAssets.pose;
let renderLoopId = null;
let referenceGhostEnabled = false;

function getChallengeReplayUrl() {
  const challengeId = analysisAssets.challengeId || "marching-on-beat-check";
  return `record.html?challenge=${encodeURIComponent(challengeId)}`;
}

function goToChallengeLibrary() {
  window.location.href = "record.html";
}

function goToChallengeReplay() {
  window.location.href = getChallengeReplayUrl();
}

function getAnalysisManifestUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("manifest") || "edit/current_analysis.json";
}

async function loadAnalysisManifest() {
  const manifestUrl = getAnalysisManifestUrl();
  let manifest = {};
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (response.ok) {
      manifest = await response.json();
      analysisAssets = resolveAnalysisAssets(manifest);
    } else if (manifestUrl !== "edit/current_analysis.json") {
      throw new Error(`Could not load analysis manifest: ${response.status}`);
    }
  } catch {
    if (manifestUrl !== "edit/current_analysis.json") throw new Error("Could not load the selected analysis manifest.");
    analysisAssets = resolveAnalysisAssets();
  }

  video.src = analysisAssets.video;
  waveformImage.src = analysisAssets.waveform;
  sourcePoseAsset = analysisAssets.pose;
  setupResultModeUi();
}

function isReferenceGhostMode() {
  return analysisAssets.resultMode === REFERENCE_GHOST_RESULT_MODE;
}

function getCurrentChallenge() {
  return getChallengeById(analysisAssets.challengeId);
}

function getReferenceGhostVideoUrl() {
  const preferredUrl = analysisAssets.referenceVideo || "";
  const fallbackUrl = analysisAssets.referenceVideoFallback || "";
  if (!preferredUrl) return fallbackUrl;
  if (!fallbackUrl || !/\.webm(?:$|[?#])/i.test(preferredUrl)) return preferredUrl;

  const canPlayVp9Webm = Boolean(
    referenceGhostVideo.canPlayType("video/webm; codecs=vp9")
      || referenceGhostVideo.canPlayType('video/webm; codecs="vp9"')
      || referenceGhostVideo.canPlayType("video/webm"),
  );
  return canPlayVp9Webm ? preferredUrl : fallbackUrl;
}

function getReferenceGhostConfig() {
  const config = analysisAssets.referenceGhost || {};
  return {
    enabled: config.enabled !== false,
    opacity: Number.isFinite(Number(config.opacity)) ? Number(config.opacity) : 0.5,
    comparisonStartBeatNumber: Number(config.comparisonStartBeatNumber || 5),
    submittedAudioStartSeconds: Number(
      config.submittedAudioStartSeconds
        ?? beatData.audio_alignment?.aligned_audio_start_seconds
        ?? analysisAssets.analysisRange?.startSeconds
        ?? 0,
    ),
    referenceAudioStartSeconds: Number(config.referenceAudioStartSeconds ?? 0),
  };
}

function setupResultModeUi() {
  const resultMode = analysisAssets.resultMode || "";
  document.documentElement.dataset.resultMode = resultMode;
  appShell.dataset.resultMode = resultMode;
  timingPanel.hidden = false;
  scoreSummary.hidden = true;
  waveformToggleWrap.hidden = isReferenceGhostMode();
  prevBeat.textContent = isReferenceGhostMode() ? "Prev Ref" : "Prev Beat";
  nextBeat.textContent = isReferenceGhostMode() ? "Next Ref" : "Next Beat";
  prevFrame.textContent = "-1";
  nextFrame.textContent = "+1";
  beatToggleLabel.textContent = isReferenceGhostMode() ? "Reference Contacts" : "Beat Labels";
  activeBeatTitle.textContent = isReferenceGhostMode() ? "Active Ref Contact" : "Active Beat";
  nearestBeatTitle.textContent = isReferenceGhostMode() ? "Nearest Ref Contact" : "Nearest Beat";
  updateTimingPanelLabels();

  const referenceGhostUrl = getReferenceGhostVideoUrl();
  if (!isReferenceGhostMode() || !referenceGhostUrl) {
    referenceGhostEnabled = false;
    referenceGhostVideo.hidden = true;
    referenceGhostVideo.removeAttribute("src");
    referenceGhostToggleWrap.hidden = true;
    return;
  }

  const config = getReferenceGhostConfig();
  referenceGhostEnabled = config.enabled;
  referenceGhostToggle.checked = referenceGhostEnabled;
  referenceGhostToggleWrap.hidden = false;
  referenceGhostVideo.src = referenceGhostUrl;
  referenceGhostVideo.style.setProperty("--reference-ghost-opacity", String(config.opacity));
  referenceGhostVideo.hidden = !referenceGhostEnabled;
  referenceGhostVideo.load();
}

function updateTimingPanelLabels() {
  const labels = isReferenceGhostMode()
    ? {
        heading: "Your Rhythm Score",
        description: "Each step is compared with the demo. Tap a row to jump to that moment.",
        headers: ["Step", "Your Timing", "Offset", "Score", "Result"],
      }
    : {
        heading: "Your Beat Score",
        description: "Each step is scored against the beat. Tap a row to jump to that moment.",
        headers: ["Step", "Your Timing", "Offset", "Score", "Result"],
      };

  timingHeading.textContent = labels.heading;
  timingDescription.textContent = labels.description;
  labels.headers.forEach((label, index) => {
    if (timingHeaderCells[index]) timingHeaderCells[index].textContent = label;
  });
}

function shouldShowReferenceGhost() {
  return isReferenceGhostMode() && referenceGhostEnabled && Boolean(getReferenceGhostVideoUrl());
}

function getReferenceGhostCurrentTime() {
  const config = getReferenceGhostConfig();
  const referenceDurationSeconds = referenceContactData.frame_count && referenceContactData.fps
    ? referenceContactData.frame_count / referenceContactData.fps
    : referenceGhostVideo.duration;
  return getReferenceGhostPlaybackTime({
    currentTime: video.currentTime,
    submittedAudioStartSeconds: config.submittedAudioStartSeconds,
    referenceAudioStartSeconds: config.referenceAudioStartSeconds,
    referenceDurationSeconds,
  });
}

function getReferenceGhostComparisonStartEntry() {
  return getReferenceContactTimelineEntriesForPlayer()
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)[0] || null;
}

function pauseReferenceGhostBeforeComparison() {
  if (!shouldShowReferenceGhost()) return false;
  const comparisonStart = getReferenceGhostComparisonStartEntry();
  if (!comparisonStart || video.currentTime >= comparisonStart.timestamp_seconds) return false;

  const targetTime = comparisonStart.reference_timestamp_seconds;
  referenceGhostVideo.playbackRate = video.playbackRate || 1;
  referenceGhostVideo.pause();
  if (
    Number.isFinite(targetTime)
    && Math.abs(referenceGhostVideo.currentTime - targetTime) > REFERENCE_GHOST_FORCE_SYNC_TOLERANCE_SECONDS
  ) {
    referenceGhostVideo.currentTime = targetTime;
  }
  return true;
}

function syncReferenceGhostVideo(force = false) {
  if (!shouldShowReferenceGhost()) return;
  const targetTime = getReferenceGhostCurrentTime();
  referenceGhostVideo.playbackRate = video.playbackRate || 1;
  const tolerance = force
    ? REFERENCE_GHOST_FORCE_SYNC_TOLERANCE_SECONDS
    : REFERENCE_GHOST_PLAYBACK_SYNC_TOLERANCE_SECONDS;
  if (
    force
    || Math.abs(referenceGhostVideo.currentTime - targetTime) > tolerance
  ) {
    referenceGhostVideo.currentTime = targetTime;
  }
}

function syncReferenceGhostPlayback(force = false) {
  if (!shouldShowReferenceGhost()) return;
  if (pauseReferenceGhostBeforeComparison()) return;
  syncReferenceGhostVideo(force);
  if (!video.paused && !video.ended && referenceGhostVideo.paused) {
    referenceGhostVideo.play().catch(() => {});
  }
}

function playReferenceGhostVideo() {
  if (!shouldShowReferenceGhost()) return;
  referenceGhostVideo.hidden = false;
  syncReferenceGhostPlayback(true);
}

function pauseReferenceGhostVideo() {
  referenceGhostVideo.pause();
}

function setReferenceGhostEnabled(enabled) {
  referenceGhostEnabled = Boolean(enabled) && isReferenceGhostMode() && Boolean(getReferenceGhostVideoUrl());
  referenceGhostToggle.checked = referenceGhostEnabled;
  referenceGhostVideo.hidden = !referenceGhostEnabled;
  if (!referenceGhostEnabled) {
    pauseReferenceGhostVideo();
    return;
  }
  syncReferenceGhostPlayback(true);
}

async function loadBeatData() {
  const response = await fetch(analysisAssets.beats);
  if (!response.ok) throw new Error(`Could not load beat data: ${response.status}`);
  beatData = await response.json();
}

async function loadPoseData() {
  const response = await fetch(analysisAssets.pose);
  if (!response.ok) throw new Error(`Could not load pose data: ${response.status}`);
  poseData = await response.json();
  updatePoseSummary();
}

async function loadReferenceContactData() {
  referenceContactData = { fps: 60, frame_count: 0, contacts: [] };
  if (!isReferenceGhostMode() || !analysisAssets.referenceContacts) return;

  const response = await fetch(analysisAssets.referenceContacts);
  if (!response.ok) throw new Error(`Could not load reference contacts: ${response.status}`);
  referenceContactData = await response.json();
}

function updatePoseSummary() {
  const detected = poseData.detected_frames ?? 0;
  const processed = poseData.processed_frames ?? poseData.frame_count ?? 0;
  const frameCount = poseData.frame_count ?? poseData.frames.length;
  const summary = processed && processed !== frameCount
    ? `${detected}/${processed} processed frames`
    : `${detected}/${frameCount} frames`;
  document.querySelector("[data-pose-frames]").textContent = summary;
}

function getFps() {
  return beatData.fps || 60;
}

function getVideoStartOffset() {
  return Number(
    beatData.video_start_offset_seconds
      ?? poseData.video_start_offset_seconds
      ?? analysisAssets.videoStartOffsetSeconds
      ?? 0,
  );
}

function getDuration() {
  return video.duration || beatData.duration_seconds || 0;
}

function getFrame() {
  return getNearestFrame(video.currentTime, getFps(), getVideoStartOffset());
}

function setPlayerAnalysisReady(ready, message = "Loading timing analysis...") {
  playerAnalysisReady = Boolean(ready);
  document.documentElement.dataset.analysisLoading = playerAnalysisReady ? "false" : "true";
  analysisLoading.hidden = playerAnalysisReady;
  analysisLoading.textContent = message;
  if (!playerAnalysisReady && !video.paused) video.pause();
  setButtonState();
}

function setButtonState() {
  const label = video.paused ? "Play" : "Pause";
  playToggle.setAttribute("aria-label", `${label} video`);
  playToggle.title = `${label} video`;
  playToggle.dataset.playbackState = video.paused ? "paused" : "playing";
  playToggle.disabled = !playerAnalysisReady;
  timeline.disabled = !playerAnalysisReady;
  prevBeat.disabled = !playerAnalysisReady;
  nextBeat.disabled = !playerAnalysisReady;
  prevFrame.disabled = !playerAnalysisReady;
  nextFrame.disabled = !playerAnalysisReady;
}

function renderBeatRail() {
  beatRail.innerHTML = "";
  beatRail.hidden = !beatToggle.checked;
  const duration = beatData.duration_seconds || getDuration();
  for (const markerItem of getTimelineMarkers()) {
    const marker = document.createElement("button");
    marker.className = "beat-marker";
    marker.classList.toggle("inferred", !isReferenceGhostMode() && markerItem.source === "inferred");
    marker.type = "button";
    marker.style.left = `${(markerItem.timestamp_seconds / duration) * 100}%`;
    marker.title = isReferenceGhostMode()
      ? `Reference Contact #${markerItem.number} - ${formatFootLabel(markerItem.foot)} at ${markerItem.timestamp_seconds.toFixed(3)}s`
      : `Beat #${markerItem.number} at ${markerItem.timestamp_seconds.toFixed(3)}s (${formatBeatSource(markerItem.source)})`;
    marker.addEventListener("click", () => {
      video.pause();
      video.currentTime = markerItem.timestamp_seconds;
    });
    beatRail.append(marker);
  }
}

function getPlaybackBeats() {
  const beats = beatGrid?.beats?.length ? beatGrid.beats : beatData.beats;
  if (!isReferenceGhostMode()) return beats;
  return getReferenceGhostComparisonBeats(
    beats,
    getReferenceGhostConfig().comparisonStartBeatNumber,
  );
}

function getReferenceContactTimelineEntriesForPlayer() {
  const config = getReferenceGhostConfig();
  return getReferenceContactTimelineEntries({
    contacts: referenceContactData.contacts,
    fps: getFps(),
    frameCount: beatData.frame_count || poseData.frame_count || 1,
    submittedAudioStartSeconds: config.submittedAudioStartSeconds,
    referenceAudioStartSeconds: config.referenceAudioStartSeconds,
    videoStartOffset: getVideoStartOffset(),
  });
}

function getReferenceContactAnalysisFrameRangeForPlayer() {
  const config = getReferenceGhostConfig();
  return getReferenceContactAnalysisFrameRange({
    contacts: referenceContactData.contacts,
    fps: getFps(),
    frameCount: beatData.frame_count || poseData.frame_count || 1,
    submittedAudioStartSeconds: config.submittedAudioStartSeconds,
    referenceAudioStartSeconds: config.referenceAudioStartSeconds,
    videoStartOffset: getVideoStartOffset(),
  });
}

function getTimelineMarkers() {
  return isReferenceGhostMode() ? getReferenceContactTimelineEntriesForPlayer() : getPlaybackBeats();
}

function formatSignedOffsetMs(offsetMs) {
  if (offsetMs === 0) return "0 ms";
  return `${offsetMs > 0 ? "+" : ""}${offsetMs} ms`;
}

function formatSignedFrames(offsetFrames) {
  if (offsetFrames === 0) return "0";
  return `${offsetFrames > 0 ? "+" : ""}${offsetFrames}`;
}

function formatFrameWord(count) {
  return `${count} frame${count === 1 ? "" : "s"}`;
}

function formatFrameTiming(offsetFrames) {
  if (!Number.isFinite(offsetFrames)) return "-";
  const roundedFrames = Math.round(offsetFrames);
  if (roundedFrames === 0) return "On time";
  const direction = roundedFrames < 0 ? "early" : "late";
  return `${formatFrameWord(Math.abs(roundedFrames))} ${direction}`;
}

function formatTimingOffset(row) {
  if (row.offsetFrames === null || row.offsetMs === null) return "-";
  return `${formatFrameTiming(row.offsetFrames)} (${formatSignedOffsetMs(row.offsetMs)})`;
}

function getReferenceContactTimingScore() {
  const referenceContacts = getReferenceContactTimelineEntriesForPlayer();
  if (!referenceContacts.length) return null;
  return buildReferenceContactTimingScore({
    referenceContacts,
    contacts,
    fps: getFps(),
  });
}

function formatUserStepLabel(row) {
  if (!row.contactNumber) return "Missing";
  return `Your #${row.beatNumber} - ${formatFootLabel(row.foot)}`;
}

function formatReferenceAlignedUserStepLabel(row) {
  if (!row.contactNumber) return "Missing";
  return `Your #${row.referenceContactNumber} - ${formatFootLabel(row.foot ?? row.referenceFoot)}`;
}

function formatExtraContactLabel(row) {
  const footLabel = formatFootLabel(row.foot);
  return footLabel === "-" ? "Extra Contact" : `Extra Contact - ${footLabel}`;
}

function getMatchedTimingRows(timingScore) {
  return timingScore.rows.filter((row) => row.rowType !== "extra" && Number.isFinite(row.offsetFrames));
}

function formatAverageTiming(timingScore) {
  const matchedRows = getMatchedTimingRows(timingScore);
  if (!matchedRows.length) return "No matched steps";
  const averageFrames = Math.round(
    matchedRows.reduce((sum, row) => sum + row.offsetFrames, 0) / matchedRows.length,
  );
  return formatFrameTiming(averageFrames);
}

function formatPhaseCalibration(phaseCalibration) {
  if (!analysisCompleted || !phaseCalibration) return "not calibrated";
  const frameOffset = formatSignedFrames(phaseCalibration.offsetFrames);
  const msOffset = formatSignedOffsetMs(Math.round(phaseCalibration.offsetSeconds * 1000));
  if (!phaseCalibration.applied) {
    if (phaseCalibration.suggestedOffsetFrames) {
      const suggestedFrames = formatSignedFrames(phaseCalibration.suggestedOffsetFrames);
      const suggestedMs = formatSignedOffsetMs(Math.round(phaseCalibration.suggestedOffsetSeconds * 1000));
      return `suggested ${suggestedFrames} frames / ${suggestedMs}, not applied (${phaseCalibration.supportCount}/${phaseCalibration.candidateCount} onset support)`;
    }
    return `0 frames (${phaseCalibration.supportCount}/${phaseCalibration.candidateCount} onset support)`;
  }
  return `${frameOffset} frames / ${msOffset} (${phaseCalibration.supportCount}/${phaseCalibration.candidateCount} onset support)`;
}

function formatPhaseCalibrationMessage(phaseCalibration) {
  if (!phaseCalibration) return "";
  if (phaseCalibration.applied) {
    return `Beat phase was auto-shifted ${formatSignedFrames(phaseCalibration.offsetFrames)} frames from audio onset evidence.`;
  }
  if (phaseCalibration.suggestedOffsetFrames) {
    return `Audio onset evidence suggested only ${formatSignedFrames(phaseCalibration.suggestedOffsetFrames)} frame of phase shift, so the beat grid was not moved.`;
  }
  return phaseCalibration.warning || "";
}

function renderTimingTable() {
  scoreSummary.hidden = true;
  scoreSummary.innerHTML = "";

  if (isReferenceGhostMode()) {
    renderReferenceContactTimingTable();
    return;
  }

  if (!analysisCompleted) {
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">Select an analysis start and end point, then click Analyze Range.</td>
      </tr>
    `;
    return;
  }

  if (poseQuality.rejected) {
    const message = formatPoseQualityRejection(poseQuality);
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">${message}</td>
      </tr>
    `;
    return;
  }

  if (!scoredBeats.length) {
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">No beat grid entries were found inside the selected range. Choose a range that includes clear music.</td>
      </tr>
    `;
    return;
  }

  const timingScore = buildBeatTimingScore({
    contacts,
    beats: scoredBeats,
    fps: getFps(),
  });

  renderScoreSummary(timingScore);
  timingTable.innerHTML = "";
  for (const row of timingScore.rows) {
    const tr = document.createElement("tr");
    const statusClass = row.status.toLowerCase().replace(/\s+/g, "-");
    tr.dataset.status = statusClass;
    if (row.rowType === "extra") {
      tr.innerHTML = `
        <td>Extra</td>
        <td>Contact #${row.contactNumber} - ${formatFootLabel(row.foot)}</td>
        <td>-</td>
        <td>-</td>
        <td><span class="timing-status ${statusClass}">Extra Contact</span></td>
      `;
      tr.addEventListener("click", () => seekTo(row.contactTime));
    } else {
      tr.innerHTML = `
        <td>Step #${row.beatNumber}</td>
        <td>${formatUserStepLabel(row)}</td>
        <td>${formatTimingOffset(row)}</td>
        <td>${row.score}</td>
        <td><span class="timing-status ${statusClass}">${row.status}</span></td>
      `;
      tr.addEventListener("click", () => seekTo(row.contactTime ?? row.beatTime));
    }
    timingTable.append(tr);
  }
}

function renderReferenceContactTimingTable() {
  timingPanel.hidden = false;

  if (!analysisDataLoaded) {
    scoreSummary.hidden = true;
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">Loading timing analysis...</td>
      </tr>
    `;
    return;
  }

  if (poseQuality.rejected) {
    const message = formatPoseQualityRejection(poseQuality);
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">${message}</td>
      </tr>
    `;
    return;
  }

  const timingScore = getReferenceContactTimingScore();
  if (!timingScore) {
    timingTable.innerHTML = `
      <tr class="rejection-row">
        <td colspan="5">No reference contacts were found for this challenge.</td>
      </tr>
    `;
    return;
  }

  renderScoreSummary(timingScore, {
    averageLabel: "Step average",
    perfectTitle: "Perfect Steps",
    stepNoun: "steps",
  });
  timingTable.innerHTML = "";

  for (const row of timingScore.rows) {
    const tr = document.createElement("tr");
    const statusClass = row.status.toLowerCase().replace(/\s+/g, "-");
    tr.dataset.status = statusClass;
    if (row.rowType === "extra") {
      tr.innerHTML = `
        <td>Extra</td>
        <td>${formatExtraContactLabel(row)}</td>
        <td>-</td>
        <td>-</td>
        <td><span class="timing-status ${statusClass}">Extra Contact</span></td>
      `;
      tr.addEventListener("click", () => seekTo(row.contactTime));
    } else {
      tr.innerHTML = `
        <td>Step #${row.referenceContactNumber}</td>
        <td>${formatReferenceAlignedUserStepLabel(row)}</td>
        <td>${formatTimingOffset(row)}</td>
        <td>${row.score}</td>
        <td><span class="timing-status ${statusClass}">${row.status}</span></td>
      `;
      tr.addEventListener("click", () => seekTo(row.contactTime ?? row.referenceContactTime));
    }
    timingTable.append(tr);
  }
}

function renderScoreSummary(timingScore, labels = {}) {
  const missed = timingScore.missedBeatNumbers.length
    ? timingScore.missedBeatNumbers.map((number) => `#${number}`).join(", ")
    : "none";
  const best = timingScore.bestBeatRanges.length
    ? timingScore.bestBeatRanges.join(", ")
    : "None";
  const needsWork = timingScore.needsWorkBeatRanges.length
    ? timingScore.needsWorkBeatRanges.join(", ")
    : "None";
  const penalty = timingScore.extraContactPenalty
    ? `${timingScore.extraContactPenalty} point extra-step penalty`
    : "";

  scoreSummary.hidden = false;
  const perfectCount = timingScore.perfectContactCount ?? timingScore.perfectBeatCount;
  const expectedCount = timingScore.expectedContactCount ?? timingScore.expectedBeatCount;
  const averageLabel = labels.averageLabel || "Beat average";
  const perfectTitle = labels.perfectTitle || "Perfect Steps";
  const stepNoun = labels.stepNoun || "steps";
  scoreSummary.innerHTML = `
    <div class="score-card primary">
      <span>Score</span>
      <strong>${timingScore.overallScore}/100</strong>
      <small>${averageLabel}: ${timingScore.beatAverageScore}/100${penalty ? ` - ${penalty}` : ""}</small>
    </div>
    <div class="score-card">
      <span>Average Timing</span>
      <strong>${formatAverageTiming(timingScore)}</strong>
      <small>${perfectTitle}: ${perfectCount}/${expectedCount}</small>
    </div>
    <div class="score-card">
      <span>Best Steps</span>
      <strong>${best}</strong>
      <small>These ${stepNoun} were on time.</small>
    </div>
    <div class="score-card">
      <span>Needs Work</span>
      <strong>${needsWork}</strong>
      <small>Missed: ${missed} • Main issue: ${timingScore.mostCommonIssue} • Extra steps: ${timingScore.extraContactCount}</small>
    </div>
  `;
}

function formatFootLabel(foot) {
  if (foot === "right") return "Right";
  if (foot === "left") return "Left";
  return "-";
}

function getDisplayRect() {
  return getContainRect({
    canvasWidth: poseCanvas.width,
    canvasHeight: poseCanvas.height,
    videoWidth: video.videoWidth || poseData.width || 1080,
    videoHeight: video.videoHeight || poseData.height || 1920,
  });
}

function shouldDrawPoseConnection([from, to]) {
  return LOWER_BODY_OVERLAY_LANDMARKS.has(from) && LOWER_BODY_OVERLAY_LANDMARKS.has(to);
}

function getPoseFrameByNumber(poseSource, frameNumber) {
  const frames = poseSource.frames || [];
  if (!frames.length) return null;

  const clampedFrame = Math.min(Math.max(Math.round(frameNumber), 0), frames.length - 1);
  const directFrame = frames[clampedFrame];
  if (!directFrame || directFrame.frame === clampedFrame || directFrame.frame === frameNumber) return directFrame;
  return frames.find((frame) => frame.frame === frameNumber) || directFrame;
}

function drawPoseFrame({ context, poseFrame, poseSource, rect, style }) {
  if (!poseFrame?.points || Object.keys(poseFrame.points).length === 0) {
    return { visiblePoints: 0, visibleConnections: 0 };
  }

  const confidenceThreshold = 0.2;
  const getPoint = (name) => {
    const point = poseFrame.points[name];
    if (!point || point.visibility < confidenceThreshold) return null;
    return mapNormalizedPointToCanvas(point, rect);
  };

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = style.connectionWidth;
  context.strokeStyle = style.connectionStroke;

  let visibleConnections = 0;
  for (const [from, to] of (poseSource.connections || []).filter(shouldDrawPoseConnection)) {
    const start = getPoint(from);
    const end = getPoint(to);
    if (!start || !end) continue;
    visibleConnections += 1;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  let visiblePoints = 0;
  for (const name of (poseSource.landmarks || []).filter((name) => LOWER_BODY_OVERLAY_LANDMARKS.has(name))) {
    const point = getPoint(name);
    if (!point) continue;
    visiblePoints += 1;
    context.beginPath();
    context.arc(point.x, point.y, style.pointRadius, 0, Math.PI * 2);
    context.fillStyle = style.pointFill;
    context.fill();
    context.lineWidth = style.pointStrokeWidth;
    context.strokeStyle = style.pointStroke;
    context.stroke();
    context.lineWidth = style.connectionWidth;
    context.strokeStyle = style.connectionStroke;
  }

  return { visiblePoints, visibleConnections };
}

function syncOverlayLayout() {
  const width = Math.max(1, Math.round(videoStage.clientWidth));
  const height = Math.max(1, Math.round(videoStage.clientHeight));
  poseCanvas.width = width;
  poseCanvas.height = height;

  const rect = getDisplayRect();
  const waveformHeight = Math.min(
    WAVEFORM_MAX_HEIGHT,
    Math.max(WAVEFORM_MIN_HEIGHT, Math.round(rect.height * WAVEFORM_HEIGHT_RATIO)),
  );
  waveformOverlay.style.left = `${rect.x}px`;
  waveformOverlay.style.top = `${rect.y + rect.height - waveformHeight}px`;
  waveformOverlay.style.width = `${rect.width}px`;
  waveformOverlay.style.height = `${waveformHeight}px`;
}

function drawPose() {
  const context = poseCanvas.getContext("2d");
  context.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
  poseCanvas.dataset.poseFrame = "";
  poseCanvas.dataset.visiblePoints = "0";
  poseCanvas.dataset.visibleConnections = "0";

  const shouldDrawUserPose = poseToggle.checked && poseData.frames.length;
  if (!shouldDrawUserPose) return;

  const rect = getDisplayRect();

  if (shouldDrawUserPose) {
    const currentFrame = Math.min(getFrame(), poseData.frames.length - 1);
    const poseFrame = getPoseFrameByNumber(poseData, currentFrame);
    poseCanvas.dataset.poseFrame = String(currentFrame);
    const userResult = drawPoseFrame({
      context,
      poseFrame,
      poseSource: poseData,
      rect,
      style: {
        connectionWidth: 5,
        connectionStroke: "rgba(255, 212, 0, 0.92)",
        pointRadius: 8,
        pointFill: "rgba(255, 255, 255, 0.96)",
        pointStroke: "rgba(0, 0, 0, 0.85)",
        pointStrokeWidth: 3,
      },
    });
    poseCanvas.dataset.visiblePoints = String(userResult.visiblePoints);
    poseCanvas.dataset.visibleConnections = String(userResult.visibleConnections);
  }
}

function updateWaveform() {
  if (isReferenceGhostMode()) {
    waveformOverlay.hidden = true;
    return;
  }
  waveformOverlay.hidden = !waveformToggle.checked;
  if (!waveformToggle.checked) return;
  waveformPlayhead.style.left = `${Math.min(Math.max(video.currentTime / getDuration(), 0), 1) * 100}%`;
}

function formatOwnedContactLabel(owner, label) {
  if (!label) return "";
  return label.replace(/^Contact #/, `${owner} #`);
}

function getReferenceAlignedUserContacts() {
  const timingScore = getReferenceContactTimingScore();
  if (!timingScore) return [];
  return timingScore.rows
    .filter((row) => row.rowType === "reference_contact" && row.contactNumber)
    .map((row) => ({
      number: row.referenceContactNumber,
      foot: row.foot ?? row.referenceFoot,
      frame: row.contactFrame,
      timestamp_seconds: row.contactTime,
      rawContactNumber: row.contactNumber,
      source: "reference_aligned_user_contact",
    }));
}

function getActiveReferenceContactLabel() {
  if (!isReferenceGhostMode() || !referenceContactData.contacts.length) return "";
  return getActiveContactLabel(getFrame(), getReferenceContactTimelineEntriesForPlayer(), 5, { includeFoot: false });
}

function getActiveReferenceAlignedUserContactLabel(currentFrame = getFrame()) {
  if (!isReferenceGhostMode()) return "";
  return getActiveContactLabel(currentFrame, getReferenceAlignedUserContacts(), 5, { includeFoot: false });
}

function isFrameInOverlayHold(currentFrame, eventFrame, holdFrames = 5) {
  return Number.isFinite(eventFrame)
    && currentFrame >= eventFrame
    && currentFrame < eventFrame + holdFrames;
}

function formatReferenceTimingResultLabel(row) {
  if (!row) return "";
  if (row.rowType === "extra") return "Extra Step";
  if (row.status === "Missed") return "Missing";
  if (!Number.isFinite(row.offsetFrames) || row.status === "Perfect") return row.status;
  return `${row.status} · ${formatFrameTiming(row.offsetFrames)}`;
}

function getActiveReferenceTimingResultLabel(currentFrame = getFrame()) {
  if (!isReferenceGhostMode()) return "";
  const timingScore = getReferenceContactTimingScore();
  if (!timingScore) return "";

  const matchedRow = timingScore.rows.find((row) => (
    row.rowType === "reference_contact"
    && row.contactNumber
    && isFrameInOverlayHold(currentFrame, row.contactFrame)
  ));
  if (matchedRow) return formatReferenceTimingResultLabel(matchedRow);

  const extraRow = timingScore.rows.find((row) => (
    row.rowType === "extra"
    && isFrameInOverlayHold(currentFrame, row.contactFrame)
  ));
  if (extraRow) return formatReferenceTimingResultLabel(extraRow);

  const missingRow = timingScore.rows.find((row) => (
    row.rowType === "reference_contact"
    && !row.contactNumber
    && isFrameInOverlayHold(currentFrame, row.referenceContactFrame)
  ));
  return missingRow ? formatReferenceTimingResultLabel(missingRow) : "";
}

function getNearestReferenceContactLabel() {
  if (!isReferenceGhostMode() || !referenceContactData.contacts.length) return "none";
  const nearestContact = getNearestBeat(video.currentTime, getReferenceContactTimelineEntriesForPlayer());
  if (!nearestContact) return "none";
  return `Reference Contact #${nearestContact.number} - ${formatFootLabel(nearestContact.foot)} at ${nearestContact.timestamp_seconds.toFixed(3)}s`;
}

function updateReviewScorePrompt() {
  reviewScorePrompt.hidden = !(isReferenceGhostMode() && playerAnalysisReady && video.ended);
}

function updateReadouts() {
  const fps = getFps();
  const currentFrame = getFrame();
  const playbackBeats = getPlaybackBeats();
  const activeLabel = getActiveBeatLabel(currentFrame, playbackBeats);
  const activeContactLabel = isReferenceGhostMode()
    ? getActiveReferenceAlignedUserContactLabel(currentFrame)
    : getActiveContactLabel(currentFrame, contacts, 5, { includeFoot: true });
  const activeReferenceContactLabel = formatOwnedContactLabel("Demo", getActiveReferenceContactLabel());
  const activeUserContactLabel = isReferenceGhostMode()
    ? formatOwnedContactLabel("Your", getActiveReferenceAlignedUserContactLabel())
    : activeContactLabel;
  const activeTimingResultLabel = getActiveReferenceTimingResultLabel(currentFrame);
  const nearestBeat = getNearestBeat(video.currentTime, playbackBeats);

  currentTimeOutput.textContent = formatTime(video.currentTime);
  currentFrameOutput.textContent = String(currentFrame);
  activeBeatOutput.textContent = isReferenceGhostMode() ? (activeReferenceContactLabel || "none") : (activeLabel || "none");
  activeContactOutput.textContent = (isReferenceGhostMode() ? activeUserContactLabel : activeContactLabel) || "none";
  nearestBeatOutput.textContent = isReferenceGhostMode() ? getNearestReferenceContactLabel() : nearestBeat
    ? `#${nearestBeat.number} at ${nearestBeat.timestamp_seconds.toFixed(3)}s (${formatBeatSource(nearestBeat.source)})`
    : "none";
  timeline.value = String(video.currentTime);

  beatOverlay.textContent = isReferenceGhostMode() ? "" : (beatToggle.checked ? activeLabel : "");
  beatOverlay.hidden = isReferenceGhostMode() ? true : (!beatToggle.checked || !activeLabel);
  beatOverlay.dataset.visible = beatOverlay.hidden ? "false" : "true";
  contactOverlay.textContent = isReferenceGhostMode() ? activeTimingResultLabel : activeContactLabel;
  contactOverlay.hidden = isReferenceGhostMode() ? !activeTimingResultLabel : !activeContactLabel;
  contactOverlay.dataset.visible = contactOverlay.hidden ? "false" : "true";

  document.documentElement.style.setProperty("--progress", `${(video.currentTime / getDuration()) * 100}%`);
  document.documentElement.style.setProperty("--frame-duration", `${(1 / fps).toFixed(6)}s`);
  updateWaveform();
  updateReviewScorePrompt();
  drawPose();
}

function startRenderLoop() {
  if (renderLoopId !== null) return;
  const tick = () => {
    syncReferenceGhostPlayback();
    updateReadouts();
    renderLoopId = video.paused ? null : window.requestAnimationFrame(tick);
  };
  renderLoopId = window.requestAnimationFrame(tick);
}

function stopRenderLoop() {
  if (renderLoopId === null) return;
  window.cancelAnimationFrame(renderLoopId);
  renderLoopId = null;
}

function handleVideoPlay() {
  setButtonState();
  playReferenceGhostVideo();
  startRenderLoop();
}

function handleVideoPause() {
  setButtonState();
  pauseReferenceGhostVideo();
  stopRenderLoop();
  updateReadouts();
}

function handleVideoTimeUpdate() {
  syncReferenceGhostPlayback();
  updateReadouts();
}

function handleVideoSeek() {
  syncReferenceGhostPlayback(true);
  updateReadouts();
}

function syncMetadata() {
  timeline.max = String(getDuration());
  timeline.step = String(1 / getFps());
  syncOverlayLayout();
  syncReferenceGhostPlayback(true);
  renderBeatRail();
  renderTimingTable();
  updateReadouts();
}

function seekTo(time) {
  video.pause();
  video.currentTime = Math.min(Math.max(time, 0), getDuration());
}

function seekByFrames(deltaFrames) {
  const time = stepFrame({
    currentTime: video.currentTime,
    fps: getFps(),
    duration: getDuration(),
    deltaFrames,
    videoStartOffset: getVideoStartOffset(),
  });
  seekTo(time);
}

function seekToAdjacentBeat(direction) {
  const targetTime = getAdjacentBeatTime({
    currentTime: video.currentTime,
    beats: getPlaybackBeats(),
    direction,
  });

  if (targetTime !== null) seekTo(targetTime);
}

function seekToAdjacentReferenceContact(direction) {
  const config = getReferenceGhostConfig();
  const targetTime = getAdjacentReferenceContactTime({
    currentTime: video.currentTime,
    contacts: referenceContactData.contacts,
    direction,
    fps: getFps(),
    frameCount: beatData.frame_count || poseData.frame_count || 1,
    submittedAudioStartSeconds: config.submittedAudioStartSeconds,
    referenceAudioStartSeconds: config.referenceAudioStartSeconds,
    videoStartOffset: getVideoStartOffset(),
  });

  if (targetTime !== null) seekTo(targetTime);
}

function seekToAdjacentTimelineMarker(direction) {
  return isReferenceGhostMode() ? seekToAdjacentReferenceContact(direction) : seekToAdjacentBeat(direction);
}

function getRangeDuration() {
  if (analysisRange.startSeconds === null || analysisRange.endSeconds === null) return 0;
  return Math.max(analysisRange.endSeconds - analysisRange.startSeconds, 0);
}

function resetRangeAnalysis() {
  analysisCompleted = false;
  scoredBeats = [];
  contacts = [];
  beatGrid = null;
  poseQuality = { rejected: false, issues: [] };
  document.documentElement.dataset.analysisRejected = "false";
  statusOutput.classList.remove("rejected");
  document.querySelector("[data-total-contacts]").textContent = "range not analyzed";
  updateBeatSummary();
  renderBeatRail();
  renderTimingTable();
  updateReadouts();
}

function updateRangeDisplay() {
  rangeStartOutput.textContent = analysisRange.startSeconds === null
    ? "not set"
    : formatTime(analysisRange.startSeconds);
  rangeEndOutput.textContent = analysisRange.endSeconds === null
    ? "not set"
    : formatTime(analysisRange.endSeconds);
  rangeDurationOutput.textContent = analysisRange.startSeconds === null || analysisRange.endSeconds === null
    ? "not set"
    : `${getRangeDuration().toFixed(3)}s`;

  setRangeEnd.disabled = analysisRange.startSeconds === null;
  analyzeRange.disabled = analysisRange.startSeconds === null
    || analysisRange.endSeconds === null
    || analysisRange.endSeconds <= analysisRange.startSeconds;
}

function setRangePrompt(message, warning = false) {
  rangePrompt.textContent = message;
  rangePrompt.classList.toggle("warning", warning);
  statusOutput.textContent = message;
}

function handleSetRangeStart() {
  video.pause();
  analysisRange.startSeconds = video.currentTime;
  if (analysisRange.endSeconds !== null && analysisRange.endSeconds <= analysisRange.startSeconds) {
    analysisRange.endSeconds = null;
  }
  resetRangeAnalysis();
  updateRangeDisplay();
  setRangePrompt("Start set. Scrub to the last frame before your feet leave frame or the dance stops, then click Set End.");
}

function handleSetRangeEnd() {
  video.pause();
  if (analysisRange.startSeconds === null) {
    setRangePrompt("Scrub to the first valid full-body frame, then click Set Start.", true);
    return;
  }

  if (video.currentTime <= analysisRange.startSeconds) {
    setRangePrompt("End must be after the selected start. Scrub forward and click Set End again.", true);
    return;
  }

  analysisRange.endSeconds = video.currentTime;
  resetRangeAnalysis();
  updateRangeDisplay();
  setRangePrompt("End set. Click Analyze Range to score only this selected section.");
}

function analyzeSelectedRange() {
  if (analysisRange.startSeconds === null || analysisRange.endSeconds === null) {
    setRangePrompt("Set both the start and end point before analyzing.", true);
    return;
  }

  const duration = getRangeDuration();
  const frameRange = getAnalysisFrameRange({
    startSeconds: analysisRange.startSeconds,
    endSeconds: analysisRange.endSeconds,
    fps: getFps(),
    videoStartOffset: getVideoStartOffset(),
    frameCount: poseData.frame_count || poseData.frames.length,
  });

  void runSelectedRangeAnalysis({ duration, frameRange });
}

async function refreshPoseDataForSelectedRange() {
  try {
    const response = await fetch("/api/analyze-range", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startSeconds: analysisRange.startSeconds,
        endSeconds: analysisRange.endSeconds,
      }),
    });

    if (response.status === 404 || response.status === 405) {
      return {
        refreshed: false,
        warning: "",
      };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Pose refresh failed with ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.pose) {
      return {
        refreshed: false,
        warning: "",
      };
    }

    analysisAssets = {
      ...analysisAssets,
      pose: payload.pose,
    };
    await loadPoseData();
    return {
      refreshed: true,
      warning: "",
    };
  } catch (error) {
    analysisAssets = {
      ...analysisAssets,
      pose: sourcePoseAsset,
    };
    await loadPoseData();
    return {
      refreshed: false,
      warning: `Pose tracker could not be reset for this range: ${error.message}`,
    };
  }
}

async function loadEssentiaBeatData() {
  try {
    const response = await fetch("/api/analyze-essentia", {
      method: "POST",
    });

    if (response.status === 404 || response.status === 405) {
      return {
        beatData: null,
        warning: "",
      };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Essentia analysis failed with ${response.status}`);
    }

    return {
      beatData: await response.json(),
      warning: "",
    };
  } catch (error) {
    return {
      beatData: null,
      warning: `Essentia.js beat analysis failed, so the app used the original peak detector: ${error.message}`,
    };
  }
}

async function runSelectedRangeAnalysis({ duration, frameRange }) {
  analysisCompleted = false;
  contacts = [];
  scoredBeats = [];
  poseQuality = { rejected: false, issues: [] };
  setRangePrompt("Analyzing selected range, resetting pose tracking, and running Essentia.js beat tracking...");

  const [poseRefresh, essentiaResult] = await Promise.all([
    refreshPoseDataForSelectedRange(),
    loadEssentiaBeatData(),
  ]);
  const rhythmData = essentiaResult.beatData ?? beatData;
  beatGrid = {
    ...buildBeatGrid({
      beats: rhythmData.beats,
      audioOnsets: rhythmData.audio_onsets ?? [],
      analysisStartSeconds: analysisRange.startSeconds,
      analysisEndSeconds: analysisRange.endSeconds,
      outputStartSeconds: 0,
      outputEndSeconds: getDuration(),
      fps: getFps(),
      videoStartOffset: getVideoStartOffset(),
      frameCount: beatData.frame_count || poseData.frame_count || poseData.frames.length,
    }),
    engine: rhythmData.engine ?? "local peak detector",
    sourceBpm: rhythmData.bpm ?? null,
    sourceConfidence: rhythmData.confidence ?? null,
  };
  scoredBeats = getBeatsInTimeRange(getPlaybackBeats(), analysisRange);
  poseQuality = analyzePoseQuality({
    poseData,
    beats: scoredBeats,
    fps: getFps(),
    frameRange,
  });
  contacts = poseQuality.rejected
    ? []
    : detectContacts(poseData, buildContactDetectionOptions({
      frameRange,
      beats: scoredBeats,
      beatGrid,
    }));
  analysisCompleted = true;

  document.querySelector("[data-total-contacts]").textContent = poseQuality.rejected
    ? "rejected"
    : `${contacts.length} contacts`;
  updateBeatSummary();
  statusOutput.classList.toggle("rejected", poseQuality.rejected);
  document.documentElement.dataset.analysisRejected = poseQuality.rejected ? "true" : "false";

  if (poseQuality.rejected) {
    setRangePrompt(formatPoseQualityRejection(poseQuality), true);
    statusOutput.classList.add("rejected");
  } else if (duration < 30) {
    const prefix = [
      poseRefresh.warning || (poseRefresh.refreshed ? "Pose tracking was reset at the selected start frame." : ""),
      essentiaResult.warning,
      formatPhaseCalibrationMessage(beatGrid.phaseCalibration),
      beatGrid.warning,
    ].filter(Boolean).join(" ");
    setRangePrompt(`${prefix ? `${prefix} ` : ""}Selected range is ${duration.toFixed(1)} seconds, so this is a diagnostic preview rather than a full 30-second score.`, true);
  } else {
    const message = [
      poseRefresh.refreshed
      ? "Range analyzed with pose tracking reset at the selected start frame."
      : "Range analyzed. The timing table now scores only the selected section.",
      essentiaResult.warning,
      formatPhaseCalibrationMessage(beatGrid.phaseCalibration),
      beatGrid.warning,
    ].filter(Boolean).join(" ");
    setRangePrompt(poseRefresh.warning ? `${poseRefresh.warning} ${message}` : message, Boolean(poseRefresh.warning || beatGrid.warning));
  }

  renderBeatRail();
  renderTimingTable();
  updateReadouts();
}

function updateBeatSummary() {
  const output = document.querySelector("[data-total-beats]");
  if (!analysisCompleted || !beatGrid) {
    output.textContent = `${beatData.beats.length} raw detected`;
    beatPhaseOutput.textContent = "not calibrated";
    return;
  }

  if (beatGrid.engine === "approved_challenge_beat_map") {
    const bpm = beatGrid.bpm ? ` • ${beatGrid.bpm.toFixed(1)} BPM` : "";
    output.textContent = `${scoredBeats.length} approved beats${bpm}`;
    if (beatGrid.audioAlignment?.timing_source === "mic_only_calibration") {
      const audioOffset = formatSignedOffsetMs(Math.round(beatGrid.audioAlignment.offset_seconds * 1000));
      beatPhaseOutput.textContent = `mic-aligned approved audio (${audioOffset})`;
    } else {
      beatPhaseOutput.textContent = "approved challenge audio";
    }
    return;
  }

  const detected = scoredBeats.filter((beat) => beat.source === "detected").length;
  const inferred = scoredBeats.length - detected;
  const bpm = beatGrid.bpm ? ` • ${beatGrid.bpm.toFixed(1)} BPM` : "";
  const engine = beatGrid.engine === "essentia.js" ? " • Essentia.js" : "";
  output.textContent = `${scoredBeats.length} beats (${detected} detected / ${inferred} inferred)${bpm}${engine}`;
  beatPhaseOutput.textContent = formatPhaseCalibration(beatGrid.phaseCalibration);
}

function formatBeatSource(source) {
  if (source === "approved") return "Approved";
  return source === "inferred" ? "Inferred" : "Detected";
}

function hasLockedSubmissionRange() {
  return analysisAssets.mode === "submission"
    && analysisAssets.analysisRange?.locked
    && Number.isFinite(analysisAssets.analysisRange.startSeconds)
    && Number.isFinite(analysisAssets.analysisRange.endSeconds);
}

function syncRangePanelVisibility() {
  rangePanel.hidden = hasLockedSubmissionRange();
  document.documentElement.dataset.lockedSubmissionRange = rangePanel.hidden ? "true" : "false";
}

function applyLockedSubmissionRange() {
  analysisRange = {
    startSeconds: analysisAssets.analysisRange.startSeconds,
    endSeconds: analysisAssets.analysisRange.endSeconds,
  };
  setRangeStart.disabled = true;
  setRangeEnd.disabled = true;
  analyzeRange.disabled = true;
}

function runLoadedSubmissionAnalysis() {
  const broadFrameRange = getAnalysisFrameRange({
    startSeconds: analysisRange.startSeconds,
    endSeconds: analysisRange.endSeconds,
    fps: getFps(),
    videoStartOffset: getVideoStartOffset(),
    frameCount: poseData.frame_count || poseData.frames.length,
  });
  const frameRange = isReferenceGhostMode()
    ? (getReferenceContactAnalysisFrameRangeForPlayer() ?? broadFrameRange)
    : broadFrameRange;

  analysisCompleted = false;
  contacts = [];
  scoredBeats = [];
  poseQuality = analysisAssets.poseQuality ?? { rejected: false, issues: [] };
  if (!analysisAssets.poseQuality) {
    poseQuality = analyzePoseQuality({
      poseData,
      beats: beatData.beats,
      fps: getFps(),
      frameRange,
    });
  }
  beatGrid = {
    beats: beatData.beats,
    bpm: beatData.bpm ?? null,
    engine: beatData.engine ?? "approved_challenge_beat_map",
    beatTimingSource: beatData.beat_timing_source
      ?? (analysisAssets.audioAlignment?.applied ? "mic_aligned_approved_reference" : ""),
    audioAlignment: {
      ...beatData.audio_alignment,
      ...(analysisAssets.audioAlignment?.applied && !beatData.audio_alignment?.timing_source
        ? { timing_source: "mic_only_calibration" }
        : {}),
    },
    phaseCalibration: null,
    warning: "",
  };
  const referenceContactTimelineEntries = isReferenceGhostMode()
    ? getReferenceContactTimelineEntriesForPlayer()
    : [];
  scoredBeats = referenceContactTimelineEntries.length
    ? referenceContactTimelineEntries
    : getBeatsInTimeRange(beatGrid.beats, analysisRange);
  const useReferenceContactsAsSubmitted = isReferenceGhostMode()
    && analysisAssets.referenceGhost?.sourceMatch === true
    && referenceContactTimelineEntries.length;
  contacts = poseQuality.rejected
    ? []
    : useReferenceContactsAsSubmitted
      ? referenceContactTimelineEntries.map((contact) => ({
        number: contact.number,
        foot: contact.foot,
        frame: contact.frame,
        timestamp_seconds: contact.timestamp_seconds,
        confidence: 1,
        source: "official_reference_contact",
      }))
      : detectContacts(poseData, buildContactDetectionOptions({
      frameRange,
      beats: scoredBeats,
      beatGrid,
    }));
  analysisCompleted = true;

  document.querySelector("[data-total-contacts]").textContent = poseQuality.rejected
    ? "rejected"
    : `${contacts.length} contacts`;
  updateBeatSummary();
  statusOutput.classList.toggle("rejected", poseQuality.rejected);
  document.documentElement.dataset.analysisRejected = poseQuality.rejected ? "true" : "false";

  if (poseQuality.rejected) {
    setRangePrompt(analysisAssets.rejectionMessage || formatPoseQualityRejection(poseQuality), true);
  } else if (isReferenceGhostMode()) {
    setRangePrompt("Submitted take loaded for visual comparison against the reference.");
  } else {
    setRangePrompt("Submitted take analyzed against the approved challenge beat map.");
  }

  renderBeatRail();
  renderTimingTable();
  updateReadouts();
  setPlayerAnalysisReady(true);
}

function buildContactDetectionOptions({ frameRange, beats, beatGrid: currentBeatGrid }) {
  const usesApprovedBeatMap = currentBeatGrid?.engine === "approved_challenge_beat_map";
  const currentChallenge = getCurrentChallenge();
  const allowReferenceGhostRecovery = isReferenceGhostMode()
    && currentChallenge?.contactDetection?.recoverReferenceGhostContacts === true;
  const allowBeatGuidedRecovery = usesApprovedBeatMap && (!isReferenceGhostMode() || allowReferenceGhostRecovery);
  const fps = getFps();
  return {
    frameRange,
    beats: allowBeatGuidedRecovery ? beats : [],
    contextPaddingFrames: usesApprovedBeatMap ? Math.round(fps * 0.75) : 0,
    recoverMissingBeatContacts: allowBeatGuidedRecovery,
    useBeatFootHints: allowReferenceGhostRecovery
      && currentChallenge?.contactDetection?.useReferenceFootHints === true,
    recoverLateralContacts: allowReferenceGhostRecovery
      && currentChallenge?.contactDetection?.recoverLateralContacts === true,
    beatContactToleranceFrames: Math.max(3, Math.round(fps * 0.12)),
    beatContactRecoveryWindowFrames: allowReferenceGhostRecovery
      ? Math.max(8, Math.round(fps * 0.35))
      : Math.max(5, Math.round(fps * 0.18)),
  };
}

function togglePlayback() {
  if (!playerAnalysisReady) return;
  if (video.paused) {
    void video.play();
  } else {
    video.pause();
  }
}

function bindControls() {
  playToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePlayback();
  });
  videoStage.addEventListener("click", (event) => {
    if (event.target.closest("[data-play-toggle]")) return;
    togglePlayback();
  });

  prevFrame.addEventListener("click", () => seekByFrames(-1));
  nextFrame.addEventListener("click", () => seekByFrames(1));
  prevBeat.addEventListener("click", () => seekToAdjacentTimelineMarker(-1));
  nextBeat.addEventListener("click", () => seekToAdjacentTimelineMarker(1));
  setRangeStart.addEventListener("click", handleSetRangeStart);
  setRangeEnd.addEventListener("click", handleSetRangeEnd);
  analyzeRange.addEventListener("click", analyzeSelectedRange);
  tryAgain.addEventListener("click", goToChallengeReplay);
  chooseAnother.addEventListener("click", goToChallengeLibrary);

  timeline.addEventListener("input", () => {
    seekTo(Number(timeline.value));
  });

  for (const toggle of [waveformToggle, beatToggle, poseToggle]) {
    toggle.addEventListener("change", () => {
      renderBeatRail();
      updateReadouts();
    });
  }
  referenceGhostToggle.addEventListener("change", () => {
    setReferenceGhostEnabled(referenceGhostToggle.checked);
    updateReadouts();
  });

  video.addEventListener("play", handleVideoPlay);
  video.addEventListener("pause", handleVideoPause);
  video.addEventListener("ended", handleVideoPause);
  video.addEventListener("timeupdate", handleVideoTimeUpdate);
  video.addEventListener("seeking", handleVideoSeek);
  video.addEventListener("seeked", handleVideoSeek);
  video.addEventListener("ratechange", () => {
    syncReferenceGhostPlayback(true);
  });
  video.addEventListener("loadedmetadata", syncMetadata);
  referenceGhostVideo.addEventListener("loadedmetadata", () => syncReferenceGhostPlayback(true));

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === " ") {
      event.preventDefault();
      playToggle.click();
    }
    if (event.key === "," || event.key === "ArrowLeft") {
      event.preventDefault();
      seekByFrames(-1);
    }
    if (event.key === "." || event.key === "ArrowRight") {
      event.preventDefault();
      seekByFrames(1);
    }
  });

  window.addEventListener("resize", syncMetadata);
}

async function init() {
  await loadAnalysisManifest();
  bindControls();
  setPlayerAnalysisReady(false, "Loading timing analysis. Preparing your score...");
  await loadBeatData();
  await loadPoseData();
  await loadReferenceContactData();
  analysisDataLoaded = true;
  document.querySelector("[data-fps]").textContent = `${beatData.fps} fps`;
  document.querySelector("[data-total-frames]").textContent = `${beatData.frame_count} frames`;
  updateBeatSummary();
  document.querySelector("[data-total-contacts]").textContent = "range not analyzed";
  updatePoseSummary();
  syncRangePanelVisibility();
  if (hasLockedSubmissionRange()) {
    applyLockedSubmissionRange();
    updateRangeDisplay();
    runLoadedSubmissionAnalysis();
  } else {
    setRangePrompt("Scrub to the first frame where your full body and both feet are clearly visible, then click Set Start.");
    updateRangeDisplay();
    setPlayerAnalysisReady(true);
  }
  if (video.readyState >= 1) syncMetadata();
  setButtonState();
}

init().catch((error) => {
  statusOutput.textContent = error.message;
  setPlayerAnalysisReady(false, error.message);
});
