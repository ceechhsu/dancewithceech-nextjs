import {
  clampFrame,
  getNearestFrame,
  roundTime,
} from "./player-core.mjs";

export function normalizeEssentiaBeatResult({
  source,
  bpm,
  confidence,
  ticks,
  intervals = [],
  audioOnsets = [],
  fps,
  durationSeconds,
  videoStartOffsetSeconds = 0,
  frameCount,
}) {
  const beats = [...ticks]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .map((timestamp, index) => {
      const roundedTimestamp = roundTime(timestamp);
      const nearestFrame = clampFrame(
        getNearestFrame(roundedTimestamp, fps, videoStartOffsetSeconds),
        frameCount,
      );

      return {
        number: index + 1,
        timestamp_seconds: roundedTimestamp,
        nearest_frame: nearestFrame,
        strength: 1,
        label_frames: Array.from({ length: 5 }, (_, offset) => nearestFrame + offset)
          .filter((frame) => frame >= 0 && frame < frameCount),
      };
    });

  return {
    source,
    engine: "essentia.js",
    fps,
    duration_seconds: roundTime(durationSeconds),
    video_start_offset_seconds: roundTime(videoStartOffsetSeconds),
    frame_count: frameCount,
    bpm: roundTime(bpm),
    confidence: roundTime(confidence),
    intervals: intervals.filter(Number.isFinite).map(roundTime),
    audio_onsets: audioOnsets
      .map(normalizeAudioOnset)
      .filter(Boolean)
      .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds),
    beats,
  };
}

function normalizeAudioOnset(onset) {
  if (Number.isFinite(onset)) {
    return {
      timestamp_seconds: roundTime(onset),
      strength: 1,
      source: "superflux",
    };
  }

  const timestamp = Number(onset?.timestamp_seconds);
  if (!Number.isFinite(timestamp)) return null;

  return {
    timestamp_seconds: roundTime(timestamp),
    strength: roundTime(Number(onset.strength ?? 1)),
    source: onset.source || "audio_onset",
  };
}
