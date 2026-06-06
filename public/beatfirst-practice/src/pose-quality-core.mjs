const FOOT_POINTS = [
  "left_front_foot",
  "right_front_foot",
  "left_heel",
  "right_heel",
  "left_ankle",
  "right_ankle",
];

const LOWER_BODY_POINTS = [
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  ...FOOT_POINTS,
];

const UPPER_BODY_POINTS = [
  "nose",
  "left_shoulder",
  "right_shoulder",
];

const FRONT_FOOT_POINTS = [
  "left_front_foot",
  "right_front_foot",
];

const DEFAULT_OPTIONS = {
  minVisibility: 0.2,
  maxBodyMissingSeconds: 0.25,
  maxBodyOutsideSeconds: 0.25,
  nearBottomY: 0.985,
  maxFootOutsideSeconds: 0.25,
  maxFrontFootNearBottomSeconds: 0.5,
};

export function analyzePoseQuality({
  poseData,
  beats = [],
  fps = poseData?.fps || 30,
  frameRange = null,
  options = {},
}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const frames = poseData?.frames || [];
  const resolvedFrameRange = frameRange
    ? clampFrameRange(frameRange, frames.length)
    : getBeatSectionFrameRange(beats, frames.length);
  const issues = [
    ...findBodyMissingIssues({ frames, beats, fps, frameRange: resolvedFrameRange, settings }),
    ...findBodyOutsideIssues({ frames, beats, fps, frameRange: resolvedFrameRange, settings }),
    ...findFootOutsideIssues({ frames, beats, fps, frameRange: resolvedFrameRange, settings }),
    ...findNearBottomIssues({ frames, beats, fps, frameRange: resolvedFrameRange, settings }),
  ];

  return {
    rejected: issues.length > 0,
    frameRange: resolvedFrameRange,
    issues,
  };
}

export function formatPoseQualityRejection(quality) {
  const issue = quality.issues[0];
  if (!issue) return "";

  const pointLabel = formatPointName(issue.pointName);
  const beatLabel = issue.nearestBeat ? ` near Beat #${issue.nearestBeat.number}` : "";
  const reason = formatIssueReason(issue.code, pointLabel, beatLabel);

  return `Video rejected: foot tracking is unreliable because ${reason}. Please resubmit a video where your full body and both feet stay clearly inside the frame, with extra space below the feet.`;
}

function findBodyMissingIssues({ frames, beats, fps, frameRange, settings }) {
  return getRequiredBodyPoints(frames)
    .map((pointName) => summarizePointFrames({
      frames,
      pointName,
      frameRange,
      minVisibility: settings.minVisibility,
      predicate: (point) => !point || point.visibility < settings.minVisibility,
      missingMatches: true,
    }))
    .filter((summary) => summary.frameCount / fps > settings.maxBodyMissingSeconds)
    .map((summary) => buildIssue({
      ...summary,
      frames,
      beats,
      fps,
      code: "body_landmark_missing",
      thresholdSeconds: settings.maxBodyMissingSeconds,
    }));
}

function findBodyOutsideIssues({ frames, beats, fps, frameRange, settings }) {
  return getRequiredBodyPoints(frames)
    .filter((pointName) => !FOOT_POINTS.includes(pointName))
    .map((pointName) => summarizePointFrames({
      frames,
      pointName,
      frameRange,
      minVisibility: settings.minVisibility,
      predicate: (point) => isOutsideFrame(point),
    }))
    .filter((summary) => summary.frameCount / fps > settings.maxBodyOutsideSeconds)
    .map((summary) => buildIssue({
      ...summary,
      frames,
      beats,
      fps,
      code: "body_landmark_out_of_frame",
      thresholdSeconds: settings.maxBodyOutsideSeconds,
    }));
}

function findFootOutsideIssues({ frames, beats, fps, frameRange, settings }) {
  return FOOT_POINTS
    .map((pointName) => summarizePointFrames({
      frames,
      pointName,
      frameRange,
      minVisibility: settings.minVisibility,
      predicate: (point) => isOutsideFrame(point),
    }))
    .filter((summary) => summary.frameCount / fps > settings.maxFootOutsideSeconds)
    .map((summary) => buildIssue({
      ...summary,
      frames,
      beats,
      fps,
      code: "foot_out_of_frame",
      thresholdSeconds: settings.maxFootOutsideSeconds,
    }));
}

function findNearBottomIssues({ frames, beats, fps, frameRange, settings }) {
  return FRONT_FOOT_POINTS
    .map((pointName) => summarizePointFrames({
      frames,
      pointName,
      frameRange,
      minVisibility: settings.minVisibility,
      predicate: (point) => point.y > settings.nearBottomY,
    }))
    .filter((summary) => summary.frameCount / fps > settings.maxFrontFootNearBottomSeconds)
    .map((summary) => buildIssue({
      ...summary,
      frames,
      beats,
      fps,
      code: "foot_near_bottom_edge",
      thresholdSeconds: settings.maxFrontFootNearBottomSeconds,
    }));
}

function summarizePointFrames({ frames, pointName, frameRange, minVisibility, predicate, missingMatches = false }) {
  let count = 0;
  let firstFrame = null;

  for (let frameIndex = frameRange.startFrame; frameIndex <= frameRange.endFrame; frameIndex += 1) {
    const point = frames[frameIndex]?.points?.[pointName];
    if (!point || point.visibility < minVisibility) {
      if (!missingMatches) continue;
      count += 1;
      firstFrame ??= frameIndex;
      continue;
    }
    if (!predicate(point)) continue;
    count += 1;
    firstFrame ??= frameIndex;
  }

  return {
    pointName,
    frameCount: count,
    firstFrame,
  };
}

function buildIssue({ code, pointName, frameCount, firstFrame, frames, beats, fps, thresholdSeconds }) {
  return {
    code,
    pointName,
    frames: frameCount,
    seconds: roundTime(frameCount / fps),
    thresholdSeconds,
    firstFrame,
    firstTime: firstFrame === null
      ? null
      : roundTime(frames[firstFrame]?.timestamp_seconds ?? firstFrame / fps),
    nearestBeat: firstFrame === null ? null : getNearestBeatForFrame(firstFrame, beats),
  };
}

function getBeatSectionFrameRange(beats, frameCount) {
  if (!beats.length || frameCount <= 0) {
    return {
      startFrame: 0,
      endFrame: Math.max(frameCount - 1, 0),
    };
  }

  return {
    startFrame: clampFrame(beats[0].nearest_frame, frameCount),
    endFrame: clampFrame((beats.at(-1).nearest_frame ?? frameCount - 1) + 4, frameCount),
  };
}

function clampFrameRange(frameRange, frameCount) {
  const startFrame = clampFrame(frameRange.startFrame ?? 0, frameCount);
  const endFrame = clampFrame(frameRange.endFrame ?? frameCount - 1, frameCount);
  return {
    startFrame: Math.min(startFrame, endFrame),
    endFrame: Math.max(startFrame, endFrame),
  };
}

function getNearestBeatForFrame(frame, beats) {
  if (!beats.length) return null;

  return beats.reduce((nearest, beat) => {
    const nearestDistance = Math.abs(nearest.nearest_frame - frame);
    const beatDistance = Math.abs(beat.nearest_frame - frame);
    return beatDistance < nearestDistance ? beat : nearest;
  }, beats[0]);
}

function isOutsideFrame(point) {
  return point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1;
}

function getRequiredBodyPoints(frames) {
  const hasUpperBody = UPPER_BODY_POINTS.some((pointName) => (
    frames.some((frame) => pointName in (frame.points || {}))
  ));
  return hasUpperBody
    ? [...UPPER_BODY_POINTS, ...LOWER_BODY_POINTS]
    : LOWER_BODY_POINTS;
}

function formatIssueReason(code, pointLabel, beatLabel) {
  if (code === "body_landmark_missing") {
    return `${pointLabel} could not be tracked${beatLabel}`;
  }
  if (code === "body_landmark_out_of_frame" || code === "foot_out_of_frame") {
    return `${pointLabel} goes outside the video frame${beatLabel}`;
  }
  return `${pointLabel} is too close to the bottom edge${beatLabel}`;
}

function clampFrame(frame, frameCount) {
  return Math.min(Math.max(frame, 0), Math.max(frameCount - 1, 0));
}

function formatPointName(pointName) {
  return pointName.replace(/_/g, " ");
}

function roundTime(value) {
  return Number(value.toFixed(6));
}
