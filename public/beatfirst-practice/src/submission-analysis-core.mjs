import {
  clampFrame,
  getNearestFrame,
  roundTime,
} from "./player-core.mjs";

import {
  extensionForRecordingMime,
} from "./submission-server-core.mjs";

export const AUDIO_BEAT_SCORE_RESULT_MODE = "marching-audio-beat-score-v1";
export const REFERENCE_GHOST_RESULT_MODE = "marching-reference-ghost-v1";

export function getSubmissionRecordingFilename(metadata) {
  const extension = metadata?.recording?.extension
    || extensionForRecordingMime(metadata?.recording?.mimeType);
  return `recording${extension}`;
}

export function getSubmissionCalibrationFilename(metadata) {
  const extension = metadata?.calibration?.extension
    || extensionForRecordingMime(metadata?.calibration?.mimeType);
  return `calibration${extension}`;
}

export function getSubmissionAudioAlignmentFilename(metadata) {
  return metadata?.calibration
    ? getSubmissionCalibrationFilename(metadata)
    : getSubmissionRecordingFilename(metadata);
}

export function getSubmissionAudioAlignmentTimingSource(metadata) {
  return metadata?.calibration ? "mic_only_calibration" : "embedded_recording_audio";
}

export function getSubmissionAudioAlignmentSearchRadiusSeconds(metadata, {
  defaultSearchRadiusSeconds = 0.75,
  recordingDurationSeconds = null,
  referenceAudioStartSeconds = 0,
} = {}) {
  if (metadata?.calibration) return defaultSearchRadiusSeconds;
  if (metadata?.recording?.source !== "saved_phone_take") return defaultSearchRadiusSeconds;

  if (isSavedTakeLikelyChallengeOnly(metadata, { recordingDurationSeconds })) {
    return roundTime(Math.max(defaultSearchRadiusSeconds, Number(referenceAudioStartSeconds || 0) + defaultSearchRadiusSeconds));
  }

  const scheduledStartSeconds = Number(metadata?.officialAudioStartTimeSeconds);
  if (!Number.isFinite(scheduledStartSeconds) || scheduledStartSeconds <= 0) {
    return defaultSearchRadiusSeconds;
  }

  return roundTime(Math.max(
    defaultSearchRadiusSeconds,
    scheduledStartSeconds + defaultSearchRadiusSeconds,
  ));
}

export function isSavedTakeLikelyChallengeOnly(metadata, {
  recordingDurationSeconds = null,
  toleranceSeconds = 0.75,
} = {}) {
  if (metadata?.calibration) return false;
  if (metadata?.recording?.source !== "saved_phone_take") return false;

  const durationSeconds = Number(recordingDurationSeconds);
  const challengeDurationSeconds = Number(metadata?.challengeDurationSeconds);
  if (!Number.isFinite(durationSeconds) || !Number.isFinite(challengeDurationSeconds)) return false;

  return durationSeconds <= challengeDurationSeconds + Math.max(0, Number(toleranceSeconds || 0));
}

export function getSubmissionAudioAlignmentExpectedOffsetSeconds(metadata, {
  recordingDurationSeconds = null,
  referenceAudioStartSeconds = 0,
} = {}) {
  if (isSavedTakeLikelyChallengeOnly(metadata, { recordingDurationSeconds })) {
    return roundTime(Number(referenceAudioStartSeconds || 0));
  }

  const scheduledStartSeconds = Number(metadata?.officialAudioStartTimeSeconds);
  if (!Number.isFinite(scheduledStartSeconds)) {
    throw new Error("Submission metadata is missing officialAudioStartTimeSeconds.");
  }

  return roundTime(scheduledStartSeconds);
}

export function buildReferenceSourceMatchAudioAlignment(metadata, {
  recordingDurationSeconds = null,
} = {}) {
  const scheduledStartSeconds = Number(metadata?.officialAudioStartTimeSeconds || 0);
  return {
    applied: true,
    offsetSeconds: 0,
    deltaSeconds: roundTime(-scheduledStartSeconds),
    correlation: 1,
    warning: "",
    timingSource: "reference_source_match",
    expectedOffsetSeconds: 0,
    recordingDurationSeconds,
    referenceSourceMatch: true,
  };
}

export function getAlignedChallengeAudioStartSeconds(metadata, {
  audioAlignmentOffsetSeconds = 0,
  audioStartSeconds = null,
} = {}) {
  if (audioStartSeconds !== null && audioStartSeconds !== undefined && Number.isFinite(Number(audioStartSeconds))) {
    return roundTime(Number(audioStartSeconds));
  }

  const scheduledStartSeconds = Number(metadata?.officialAudioStartTimeSeconds);
  if (!Number.isFinite(scheduledStartSeconds)) {
    throw new Error("Submission metadata is missing officialAudioStartTimeSeconds.");
  }

  return roundTime(scheduledStartSeconds + Number(audioAlignmentOffsetSeconds || 0));
}

export function getSubmissionAnalysisRange(metadata, {
  audioAlignmentOffsetSeconds = 0,
  audioStartSeconds = null,
} = {}) {
  const startSeconds = getAlignedChallengeAudioStartSeconds(metadata, {
    audioAlignmentOffsetSeconds,
    audioStartSeconds,
  });
  const durationSeconds = Number(metadata?.challengeDurationSeconds);
  if (!Number.isFinite(durationSeconds)) {
    throw new Error("Submission metadata is missing the official challenge timing.");
  }

  return {
    startSeconds,
    endSeconds: roundTime(startSeconds + durationSeconds),
  };
}

export function buildShiftedChallengeBeatMap({
  referenceBeatData,
  metadata,
  fps,
  frameCount,
  durationSeconds,
  videoStartOffsetSeconds = 0,
  audioAlignmentOffsetSeconds = 0,
  audioAlignmentTimingSource = "",
  referenceAudioStartSeconds = 0,
}) {
  const scheduledOffsetSeconds = Number(metadata.officialAudioStartTimeSeconds);
  if (!Number.isFinite(scheduledOffsetSeconds)) {
    throw new Error("Submission metadata is missing officialAudioStartTimeSeconds.");
  }
  const alignmentOffsetSeconds = Number(audioAlignmentOffsetSeconds || 0);
  const offsetSeconds = scheduledOffsetSeconds + alignmentOffsetSeconds;
  const hasMeasuredAlignment = Boolean(audioAlignmentTimingSource) || alignmentOffsetSeconds !== 0;
  const referenceStartSeconds = Number(referenceAudioStartSeconds || 0);

  const beats = (referenceBeatData.beats || [])
    .map((beat, index) => {
      const referenceTime = Number(beat.timestamp_seconds);
      if (!Number.isFinite(referenceTime)) return null;

      const timestamp = roundTime(referenceTime - referenceStartSeconds + offsetSeconds);
      const nearestFrame = clampFrame(
        getNearestFrame(timestamp, fps, videoStartOffsetSeconds),
        frameCount,
      );

      return {
        number: index + 1,
        timestamp_seconds: timestamp,
        nearest_frame: nearestFrame,
        strength: roundTime(Number(beat.strength ?? 1)),
        label_frames: Array.from({ length: 5 }, (_, labelOffset) => nearestFrame + labelOffset)
          .filter((frame) => frame >= 0 && frame < frameCount),
        source: "approved",
        reference_beat_number: beat.number ?? index + 1,
        reference_timestamp_seconds: roundTime(referenceTime),
      };
    })
    .filter(Boolean);

  return {
    source: metadata.submissionId,
    reference_source: referenceBeatData.source,
    engine: "approved_challenge_beat_map",
    beat_timing_source: hasMeasuredAlignment
      ? "mic_aligned_approved_reference"
      : "scheduled_approved_reference",
    fps,
    duration_seconds: roundTime(durationSeconds),
      video_start_offset_seconds: roundTime(videoStartOffsetSeconds),
    frame_count: frameCount,
    bpm: referenceBeatData.bpm ?? null,
    confidence: 1,
    audio_alignment: {
      offset_seconds: roundTime(alignmentOffsetSeconds),
      timing_source: hasMeasuredAlignment
        ? audioAlignmentTimingSource || "mic_only_calibration"
        : "scheduled_audio_start",
      scheduled_audio_start_seconds: roundTime(scheduledOffsetSeconds),
      aligned_audio_start_seconds: roundTime(offsetSeconds),
      reference_audio_start_seconds: roundTime(referenceStartSeconds),
    },
    beats,
  };
}

export function buildSubmissionAnalysisManifest({
  title,
  resultMode = REFERENCE_GHOST_RESULT_MODE,
  video,
  beats,
  pose,
  waveform,
  challengeId = "",
  referenceVideo = "",
  referenceVideoFallback = "",
  referenceContacts = "",
  referencePose = "",
  referenceGhost = {},
  analysisRange,
  micAudio = "",
  audioAlignment = null,
}) {
  const manifest = {
    title,
    mode: "submission",
    resultMode,
    video,
    beats,
    pose,
    waveform,
    analysisRange: {
      startSeconds: roundTime(analysisRange.startSeconds),
      endSeconds: roundTime(analysisRange.endSeconds),
      locked: true,
    },
  };
  if (challengeId) manifest.challengeId = challengeId;
  if (resultMode === REFERENCE_GHOST_RESULT_MODE && referenceVideo) {
    manifest.referenceVideo = referenceVideo;
    if (referenceVideoFallback) manifest.referenceVideoFallback = referenceVideoFallback;
    if (referenceContacts) manifest.referenceContacts = referenceContacts;
    if (referencePose) manifest.referencePose = referencePose;
    manifest.referenceGhost = {
      enabled: true,
      opacity: 0.5,
      comparisonStartBeatNumber: 5,
      syncCountInBeatNumbers: [1, 2, 3, 4],
      submittedAudioStartSeconds: roundTime(analysisRange.startSeconds),
      referenceAudioStartSeconds: 0,
      ...referenceGhost,
    };
  }
  if (micAudio) {
    manifest.audio = {
      defaultMode: "source",
      source: {
        label: "Source",
        kind: "embedded_clean_challenge_audio",
        timingSource: audioAlignment?.applied
          ? "mic_aligned_clean_source"
          : "scheduled_clean_source",
      },
      mic: {
        label: "Mic",
        url: micAudio,
        timingSource: audioAlignment?.timingSource || "mic_only_calibration",
      },
    };
  }
  if (audioAlignment) manifest.audioAlignment = audioAlignment;
  return manifest;
}
