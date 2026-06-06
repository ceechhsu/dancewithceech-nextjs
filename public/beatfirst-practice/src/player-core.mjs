const DEFAULT_ANALYSIS_ASSETS = {
  title: "Marching - 8 bars",
  video: "edit/Marching%20-%208%20bars_clean.mp4",
  beats: "edit/Marching%20-%208%20bars_detected_beats.json",
  pose: "edit/Marching%20-%208%20bars_pose.json",
  waveform: "edit/Marching%20-%208%20bars_waveform.png",
};

export function resolveAnalysisAssets(manifest = {}) {
  return {
    ...DEFAULT_ANALYSIS_ASSETS,
    ...manifest,
  };
}

export function roundTime(value) {
  return Number(value.toFixed(6));
}

export function getReferenceGhostPlaybackTime({
  currentTime,
  submittedAudioStartSeconds = 0,
  referenceAudioStartSeconds = 0,
  referenceDurationSeconds = Infinity,
}) {
  const targetTime = Number(currentTime) - Number(submittedAudioStartSeconds || 0) + Number(referenceAudioStartSeconds || 0);
  const maxTime = Number.isFinite(referenceDurationSeconds) ? Math.max(referenceDurationSeconds, 0) : Infinity;
  return roundTime(Math.min(Math.max(targetTime, 0), maxTime));
}

export function getReferenceGhostComparisonBeats(beats, comparisonStartBeatNumber = 1) {
  const startBeatNumber = Number(comparisonStartBeatNumber || 1);
  return beats.filter((beat) => Number(beat.reference_beat_number ?? beat.number ?? 0) >= startBeatNumber);
}

export function getNearestFrame(currentTime, fps, videoStartOffset = 0) {
  return Math.max(0, Math.round((currentTime - videoStartOffset) * fps));
}

export function clampFrame(frame, frameCount) {
  return Math.min(Math.max(frame, 0), Math.max(frameCount - 1, 0));
}

export function getReferenceContactTimelineEntries({
  contacts,
  fps,
  frameCount,
  submittedAudioStartSeconds = 0,
  referenceAudioStartSeconds = 0,
  videoStartOffset = 0,
}) {
  return (contacts || [])
    .map((contact) => {
      const referenceTime = Number(contact.timestamp_seconds);
      if (!Number.isFinite(referenceTime)) return null;
      const timestamp = roundTime(
        referenceTime
        - Number(referenceAudioStartSeconds || 0)
        + Number(submittedAudioStartSeconds || 0),
      );
      return {
        number: contact.number,
        foot: contact.foot,
        frame: clampFrame(getNearestFrame(timestamp, fps, videoStartOffset), frameCount),
        timestamp_seconds: timestamp,
        source: "reference_contact",
        reference_frame: contact.frame,
        reference_timestamp_seconds: roundTime(referenceTime),
      };
    })
    .filter(Boolean);
}

export function getReferenceContactAnalysisFrameRange({
  contacts,
  fps,
  frameCount,
  submittedAudioStartSeconds = 0,
  referenceAudioStartSeconds = 0,
  videoStartOffset = 0,
  guardFrames = 6,
  holdFrames = 5,
}) {
  const entries = getReferenceContactTimelineEntries({
    contacts,
    fps,
    frameCount,
    submittedAudioStartSeconds,
    referenceAudioStartSeconds,
    videoStartOffset,
  }).sort((a, b) => a.frame - b.frame);

  if (!entries.length) return null;

  const firstFrame = entries[0].frame;
  const lastFrame = entries[entries.length - 1].frame;
  return {
    startFrame: clampFrame(firstFrame - Math.max(0, Math.round(guardFrames)), frameCount),
    endFrame: clampFrame(
      lastFrame + Math.max(0, Math.round(holdFrames) - 1) + Math.max(0, Math.round(guardFrames)),
      frameCount,
    ),
  };
}

export function getAdjacentReferenceContactTime({
  currentTime,
  contacts,
  direction,
  fps,
  frameCount,
  submittedAudioStartSeconds = 0,
  referenceAudioStartSeconds = 0,
  videoStartOffset = 0,
  epsilon = 0.01,
}) {
  const entries = getReferenceContactTimelineEntries({
    contacts,
    fps,
    frameCount,
    submittedAudioStartSeconds,
    referenceAudioStartSeconds,
    videoStartOffset,
  });
  return getAdjacentBeatTime({ currentTime, beats: entries, direction, epsilon });
}

export function getAnalysisFrameRange({
  startSeconds,
  endSeconds,
  fps,
  videoStartOffset = 0,
  frameCount,
}) {
  const start = Math.min(startSeconds, endSeconds);
  const end = Math.max(startSeconds, endSeconds);

  return {
    startFrame: clampFrame(getNearestFrame(start, fps, videoStartOffset), frameCount),
    endFrame: clampFrame(getNearestFrame(end, fps, videoStartOffset), frameCount),
  };
}

export function getBeatsInTimeRange(beats, { startSeconds, endSeconds }) {
  const start = Math.min(startSeconds, endSeconds);
  const end = Math.max(startSeconds, endSeconds);
  return beats.filter((beat) => (
    beat.timestamp_seconds >= start && beat.timestamp_seconds <= end
  ));
}

export function buildBeatGrid({
  beats,
  audioOnsets = [],
  analysisStartSeconds,
  analysisEndSeconds,
  outputStartSeconds = analysisStartSeconds,
  outputEndSeconds = analysisEndSeconds,
  fps,
  videoStartOffset = 0,
  frameCount,
  minPeriodSeconds = 0.38,
  maxPeriodSeconds = 1.2,
  matchToleranceSeconds = null,
}) {
  const rawBeats = [...beats].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const analysisBeats = getBeatsInTimeRange(rawBeats, {
    startSeconds: analysisStartSeconds,
    endSeconds: analysisEndSeconds,
  });

  if (analysisBeats.length < 3) {
    return {
      beats: getBeatsInTimeRange(rawBeats, {
        startSeconds: outputStartSeconds,
        endSeconds: outputEndSeconds,
      }).map((beat, index) => normalizeDetectedBeat({
        beat,
        index,
        fps,
        videoStartOffset,
        frameCount,
      })),
      bpm: null,
      periodSeconds: null,
      detectedCount: analysisBeats.length,
      inferredCount: 0,
      phaseCalibration: emptyPhaseCalibration("Not enough detected beats to calibrate audio phase."),
      reliable: false,
      warning: "Not enough detected audio peaks to infer a constant BPM grid.",
    };
  }

  const periodSeconds = estimateBeatPeriod(
    analysisBeats.map((beat) => beat.timestamp_seconds),
    minPeriodSeconds,
    maxPeriodSeconds,
  );
  if (!periodSeconds) {
    return {
      beats: [],
      bpm: null,
      periodSeconds: null,
      detectedCount: 0,
      inferredCount: 0,
      phaseCalibration: emptyPhaseCalibration("Detected beats are too inconsistent to calibrate audio phase."),
      reliable: false,
      warning: "Detected audio peaks are too inconsistent to infer a constant BPM grid.",
    };
  }

  const tolerance = matchToleranceSeconds ?? Math.min(Math.max(periodSeconds * 0.32, 0.08), 0.2);
  const grid = buildFilledBeatGrid({
    rawBeats,
    phaseBeats: analysisBeats,
    audioOnsets,
    periodSeconds,
    tolerance,
    phaseStartSeconds: analysisStartSeconds,
    phaseEndSeconds: analysisEndSeconds,
    outputStartSeconds,
    outputEndSeconds,
    fps,
    videoStartOffset,
    frameCount,
  });
  const gridBeats = grid.beats;
  const detectedCount = gridBeats.filter((beat) => beat.source === "detected").length;
  const inferredCount = gridBeats.length - detectedCount;
  const reliable = analysisBeats.length >= 3 && gridBeats.length > 0;

  return {
    beats: gridBeats,
    bpm: roundTime(60 / periodSeconds),
    periodSeconds: roundTime(periodSeconds),
    detectedCount,
    inferredCount,
    phaseCalibration: grid.phaseCalibration,
    reliable,
    warning: reliable
      ? ""
      : "Detected audio peaks are too inconsistent to infer a confident constant-BPM grid.",
  };
}

export function frameToTime(frame, fps, videoStartOffset = 0) {
  return roundTime(videoStartOffset + (frame / fps));
}

export function stepFrame({ currentTime, fps, duration, deltaFrames, videoStartOffset = 0 }) {
  const frameCount = Math.max(1, Math.round(Math.max(duration - videoStartOffset, 0) * fps));
  const currentFrame = getNearestFrame(currentTime, fps, videoStartOffset);
  const targetFrame = clampFrame(currentFrame + deltaFrames, frameCount);
  return frameToTime(targetFrame, fps, videoStartOffset);
}

export function getActiveBeatLabel(frame, beats) {
  const activeBeat = beats.find((beat) => frame >= beat.nearest_frame && frame < beat.nearest_frame + 5);
  if (!activeBeat) return "";
  return `#${activeBeat.number}-${frame - activeBeat.nearest_frame + 1}`;
}

export function getBeatFrameTime(beat, fps, videoStartOffset = 0) {
  return frameToTime(beat.nearest_frame, fps, videoStartOffset);
}

export function getAdjacentBeatTime({ currentTime, beats, direction, epsilon = 0.01 }) {
  const targetBeat = direction > 0
    ? beats.find((beat) => beat.timestamp_seconds > currentTime + epsilon)
    : [...beats].reverse().find((beat) => beat.timestamp_seconds < currentTime - epsilon);

  return targetBeat ? roundTime(targetBeat.timestamp_seconds) : null;
}

export function getNearestBeat(currentTime, beats) {
  if (!beats.length) return null;

  return beats.reduce((nearest, beat) => {
    const nearestDistance = Math.abs(nearest.timestamp_seconds - currentTime);
    const beatDistance = Math.abs(beat.timestamp_seconds - currentTime);
    return beatDistance < nearestDistance ? beat : nearest;
  }, beats[0]);
}

export function getContactBeatTimingRows({
  contacts,
  beats,
  fps,
  perfectFrameThreshold = 1,
  slightFrameThreshold = 3,
}) {
  return contacts.map((contact) => {
    const beat = getNearestBeat(contact.timestamp_seconds, beats);
    const offsetMs = beat
      ? Math.round((contact.timestamp_seconds - beat.timestamp_seconds) * 1000)
      : 0;
    const offsetFrames = beat
      ? contact.frame - beat.nearest_frame
      : 0;
    const direction = offsetMs < 0 ? "early" : "late";
    const absFrames = Math.abs(offsetFrames);
    let status = "Perfect";

    if (absFrames > perfectFrameThreshold && absFrames <= slightFrameThreshold) {
      status = direction === "early" ? "Slightly Early" : "Slightly Late";
    } else if (absFrames > slightFrameThreshold) {
      status = direction === "early" ? "Early" : "Late";
    }

    return {
      contactNumber: contact.number,
      foot: contact.foot,
      contactFrame: contact.frame,
      contactTime: roundTime(contact.timestamp_seconds),
      beatNumber: beat?.number ?? null,
      beatFrame: beat?.nearest_frame ?? null,
      beatTime: beat ? roundTime(beat.timestamp_seconds) : null,
      beatSource: beat?.source ?? "detected",
      offsetMs,
      offsetFrames,
      status,
      direction,
    };
  });
}

export function buildBeatTimingScore({
  beats,
  contacts,
  fps,
  maxMatchFrames = Math.max(6, Math.round(fps * 0.35)),
  extraContactPenaltyPoints = 1,
}) {
  const sortedBeats = [...beats].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const sortedContacts = [...contacts].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const candidates = [];

  sortedBeats.forEach((beat, beatIndex) => {
    const beatFrame = resolveFrame(beat, fps);
    sortedContacts.forEach((contact, contactIndex) => {
      const contactFrame = resolveFrame(contact, fps);
      const offsetFrames = contactFrame - beatFrame;
      const absFrames = Math.abs(offsetFrames);
      if (absFrames <= maxMatchFrames) {
        candidates.push({
          beatIndex,
          contactIndex,
          absFrames,
          offsetFrames,
        });
      }
    });
  });

  candidates.sort((a, b) => (
    a.absFrames - b.absFrames
    || sortedBeats[a.beatIndex].number - sortedBeats[b.beatIndex].number
    || sortedContacts[a.contactIndex].number - sortedContacts[b.contactIndex].number
  ));

  const beatToContact = new Map();
  const usedContacts = new Set();
  for (const candidate of candidates) {
    if (beatToContact.has(candidate.beatIndex) || usedContacts.has(candidate.contactIndex)) continue;
    beatToContact.set(candidate.beatIndex, candidate.contactIndex);
    usedContacts.add(candidate.contactIndex);
  }

  const beatRows = sortedBeats.map((beat, beatIndex) => {
    const contactIndex = beatToContact.get(beatIndex);
    const beatFrame = resolveFrame(beat, fps);
    if (contactIndex === undefined) {
      return {
        rowType: "beat",
        beatNumber: beat.number,
        beatTime: roundTime(beat.timestamp_seconds),
        beatFrame,
        beatSource: beat.source ?? "detected",
        contactNumber: null,
        foot: null,
        contactTime: null,
        contactFrame: null,
        offsetMs: null,
        offsetFrames: null,
        score: 0,
        status: "Missed",
        direction: "missing",
      };
    }

    const contact = sortedContacts[contactIndex];
    const contactFrame = resolveFrame(contact, fps);
    const offsetFrames = contactFrame - beatFrame;
    const offsetMs = Math.round((contact.timestamp_seconds - beat.timestamp_seconds) * 1000);
    const scoreResult = scoreBeatOffset(offsetFrames);

    return {
      rowType: "beat",
      beatNumber: beat.number,
      beatTime: roundTime(beat.timestamp_seconds),
      beatFrame,
      beatSource: beat.source ?? "detected",
      contactNumber: contact.number,
      foot: contact.foot,
      contactTime: roundTime(contact.timestamp_seconds),
      contactFrame,
      offsetMs,
      offsetFrames,
      score: scoreResult.score,
      status: scoreResult.status,
      direction: scoreResult.direction,
    };
  });

  const extraRows = sortedContacts
    .map((contact, contactIndex) => ({ contact, contactIndex }))
    .filter(({ contactIndex }) => !usedContacts.has(contactIndex))
    .map(({ contact }) => ({
      rowType: "extra",
      beatNumber: null,
      beatTime: null,
      beatFrame: null,
      beatSource: "",
      contactNumber: contact.number,
      foot: contact.foot,
      contactTime: roundTime(contact.timestamp_seconds),
      contactFrame: resolveFrame(contact, fps),
      offsetMs: null,
      offsetFrames: null,
      score: null,
      status: "Extra Contact",
      direction: "extra",
    }));

  const beatScores = beatRows.map((row) => row.score);
  const beatAverageScore = beatScores.length
    ? Math.round(beatScores.reduce((sum, score) => sum + score, 0) / beatScores.length)
    : 0;
  const extraContactPenalty = Math.min(
    extraRows.length * extraContactPenaltyPoints,
    beatAverageScore,
  );
  const overallScore = Math.max(0, beatAverageScore - extraContactPenalty);
  const missedBeatNumbers = beatRows
    .filter((row) => row.status === "Missed")
    .map((row) => row.beatNumber);

  return {
    overallScore,
    beatAverageScore,
    extraContactPenalty,
    expectedBeatCount: beatRows.length,
    matchedBeatCount: beatRows.length - missedBeatNumbers.length,
    missedBeatNumbers,
    extraContactCount: extraRows.length,
    perfectBeatCount: beatRows.filter((row) => row.score === 100).length,
    needsWorkBeatRanges: compressBeatNumberRanges(beatRows
      .filter((row) => row.score < 70)
      .map((row) => row.beatNumber)),
    bestBeatRanges: compressBeatNumberRanges(beatRows
      .filter((row) => row.score === 100)
      .map((row) => row.beatNumber)),
    mostCommonIssue: getMostCommonTimingIssue(beatRows),
    rows: [...beatRows, ...extraRows],
  };
}

export function buildReferenceContactTimingScore({
  referenceContacts,
  contacts,
  fps,
  extraContactPenaltyPoints = 1,
  maxMatchFrames = null,
}) {
  const sortedReferenceContacts = referenceContacts
    .map((referenceContact) => ({
      contact: referenceContact,
      frame: resolveFrame(referenceContact, fps),
    }))
    .sort((a, b) => (
      a.frame - b.frame
      || a.contact.timestamp_seconds - b.contact.timestamp_seconds
      || a.contact.number - b.contact.number
    ));
  const sortedContacts = contacts
    .map((contact) => ({
      contact,
      frame: resolveFrame(contact, fps),
    }))
    .sort((a, b) => (
      a.frame - b.frame
      || a.contact.timestamp_seconds - b.contact.timestamp_seconds
      || a.contact.number - b.contact.number
    ));
  const effectiveMaxMatchFrames = Number.isFinite(maxMatchFrames)
    ? Math.max(0, Math.round(maxMatchFrames))
    : getReferenceContactMaxMatchFrames(sortedReferenceContacts, fps);
  const usedContactIndexes = new Set();

  const contactRows = sortedReferenceContacts.map(({ contact: referenceContact, frame: referenceContactFrame }) => {
    let bestContactIndex = -1;
    let bestDistanceFrames = Infinity;

    sortedContacts.forEach(({ frame: contactFrame }, contactIndex) => {
      if (usedContactIndexes.has(contactIndex)) return;

      const distanceFrames = Math.abs(contactFrame - referenceContactFrame);
      if (distanceFrames > effectiveMaxMatchFrames) return;
      if (distanceFrames >= bestDistanceFrames) return;

      bestDistanceFrames = distanceFrames;
      bestContactIndex = contactIndex;
    });

    if (bestContactIndex === -1) {
      return {
        rowType: "reference_contact",
        referenceContactNumber: referenceContact.number,
        referenceContactTime: roundTime(referenceContact.timestamp_seconds),
        referenceContactFrame,
        referenceFoot: referenceContact.foot,
        contactNumber: null,
        foot: null,
        contactTime: null,
        contactFrame: null,
        offsetMs: null,
        offsetFrames: null,
        score: 0,
        status: "Missed",
        direction: "missing",
      };
    }

    usedContactIndexes.add(bestContactIndex);
    const { contact, frame: contactFrame } = sortedContacts[bestContactIndex];
    const offsetFrames = contactFrame - referenceContactFrame;
    const offsetMs = Math.round((contact.timestamp_seconds - referenceContact.timestamp_seconds) * 1000);
    const scoreResult = scoreBeatOffset(offsetFrames);

    return {
      rowType: "reference_contact",
      referenceContactNumber: referenceContact.number,
      referenceContactTime: roundTime(referenceContact.timestamp_seconds),
      referenceContactFrame,
      referenceFoot: referenceContact.foot,
      contactNumber: contact.number,
      foot: contact.foot,
      contactTime: roundTime(contact.timestamp_seconds),
      contactFrame,
      offsetMs,
      offsetFrames,
      score: scoreResult.score,
      status: scoreResult.status,
      direction: scoreResult.direction,
    };
  });

  const extraRows = sortedContacts
    .map(({ contact, frame }, contactIndex) => ({ contact, frame, contactIndex }))
    .filter(({ contactIndex }) => !usedContactIndexes.has(contactIndex))
    .map(({ contact, frame }) => ({
      rowType: "extra",
      referenceContactNumber: null,
      referenceContactTime: null,
      referenceContactFrame: null,
      referenceFoot: null,
      contactNumber: contact.number,
      foot: contact.foot,
      contactTime: roundTime(contact.timestamp_seconds),
      contactFrame: frame,
      offsetMs: null,
      offsetFrames: null,
      score: null,
      status: "Extra Contact",
      direction: "extra",
    }));

  const contactScores = contactRows.map((row) => row.score);
  const beatAverageScore = contactScores.length
    ? Math.round(contactScores.reduce((sum, score) => sum + score, 0) / contactScores.length)
    : 0;
  const extraContactPenalty = Math.min(
    extraRows.length * extraContactPenaltyPoints,
    beatAverageScore,
  );
  const overallScore = Math.max(0, beatAverageScore - extraContactPenalty);
  const missedReferenceContactNumbers = contactRows
    .filter((row) => row.status === "Missed")
    .map((row) => row.referenceContactNumber);

  return {
    overallScore,
    beatAverageScore,
    extraContactPenalty,
    expectedBeatCount: contactRows.length,
    expectedContactCount: contactRows.length,
    matchedBeatCount: contactRows.length - missedReferenceContactNumbers.length,
    matchedContactCount: contactRows.length - missedReferenceContactNumbers.length,
    missedBeatNumbers: missedReferenceContactNumbers,
    missedReferenceContactNumbers,
    extraContactCount: extraRows.length,
    perfectBeatCount: contactRows.filter((row) => row.score === 100).length,
    perfectContactCount: contactRows.filter((row) => row.score === 100).length,
    needsWorkBeatRanges: compressBeatNumberRanges(contactRows
      .filter((row) => row.score < 70)
      .map((row) => row.referenceContactNumber)),
    bestBeatRanges: compressBeatNumberRanges(contactRows
      .filter((row) => row.score === 100)
      .map((row) => row.referenceContactNumber)),
    mostCommonIssue: getMostCommonTimingIssue(contactRows),
    rows: [...contactRows, ...extraRows],
  };
}

function getReferenceContactMaxMatchFrames(sortedReferenceContacts, fps) {
  const fallbackFrames = Math.max(6, Math.round(fps * 0.35));
  const intervals = [];
  for (let index = 1; index < sortedReferenceContacts.length; index += 1) {
    const intervalFrames = sortedReferenceContacts[index].frame - sortedReferenceContacts[index - 1].frame;
    if (intervalFrames > 0) intervals.push(intervalFrames);
  }

  if (!intervals.length) return fallbackFrames;

  intervals.sort((a, b) => a - b);
  const medianIntervalFrames = intervals[Math.floor(intervals.length / 2)];
  const minimumFrames = Math.max(4, Math.round(fps * 0.2));
  const maximumFrames = Math.max(minimumFrames, Math.round(fps * 0.5));
  return Math.max(
    minimumFrames,
    Math.min(maximumFrames, Math.ceil(medianIntervalFrames * 0.7)),
  );
}

function resolveFrame(event, fps) {
  if (Number.isFinite(event.nearest_frame)) return event.nearest_frame;
  if (Number.isFinite(event.frame)) return event.frame;
  return getNearestFrame(event.timestamp_seconds, fps);
}

function scoreBeatOffset(offsetFrames) {
  const absFrames = Math.abs(offsetFrames);
  const direction = offsetFrames === 0 ? "on" : offsetFrames < 0 ? "early" : "late";
  const directionLabel = direction === "early" ? "Early" : "Late";

  if (absFrames <= 1) {
    return { score: 100, status: "Perfect", direction: "on" };
  }
  if (absFrames === 2) {
    return { score: 85, status: `Very Close ${directionLabel}`, direction };
  }
  if (absFrames === 3) {
    return { score: 70, status: `Slightly ${directionLabel}`, direction };
  }
  if (absFrames === 4) {
    return { score: 50, status: directionLabel, direction };
  }
  if (absFrames === 5) {
    return { score: 30, status: `Very ${directionLabel}`, direction };
  }
  return { score: 10, status: `Far ${directionLabel}`, direction };
}

function compressBeatNumberRanges(numbers) {
  if (!numbers.length) return [];
  const ranges = [];
  let start = numbers[0];
  let previous = numbers[0];

  for (const number of numbers.slice(1)) {
    if (number === previous + 1) {
      previous = number;
      continue;
    }
    ranges.push(formatBeatRange(start, previous));
    start = number;
    previous = number;
  }

  ranges.push(formatBeatRange(start, previous));
  return ranges;
}

function formatBeatRange(start, end) {
  return start === end ? `#${start}` : `#${start}-${end}`;
}

function getMostCommonTimingIssue(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.status === "Perfect") continue;
    const issue = row.direction === "early"
      ? "Early"
      : row.direction === "late"
        ? "Late"
        : "Missed";
    counts.set(issue, (counts.get(issue) ?? 0) + 1);
  }

  if (!counts.size) return "None";
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function normalizeDetectedBeat({ beat, index, fps, videoStartOffset, frameCount }) {
  return {
    ...beat,
    number: index + 1,
    nearest_frame: beat.nearest_frame ?? clampFrame(getNearestFrame(
      beat.timestamp_seconds,
      fps,
      videoStartOffset,
    ), frameCount),
    source: "detected",
    raw_beat_number: beat.number,
    detected_timestamp_seconds: beat.timestamp_seconds,
    detection_offset_seconds: 0,
  };
}

function buildFilledBeatGrid({
  rawBeats,
  phaseBeats,
  audioOnsets,
  periodSeconds,
  tolerance,
  phaseStartSeconds,
  phaseEndSeconds,
  outputStartSeconds,
  outputEndSeconds,
  fps,
  videoStartOffset,
  frameCount,
}) {
  const phase = chooseBeatPhase({
    beats: phaseBeats,
    periodSeconds,
    startSeconds: phaseStartSeconds,
    endSeconds: phaseEndSeconds,
    tolerance,
  });

  if (!phase) {
    return {
      beats: [],
      phaseCalibration: emptyPhaseCalibration("No stable beat phase was found."),
    };
  }

  const analysisGridTimes = makeGridTimes({
    phaseTime: phase.phaseTime,
    periodSeconds,
    startSeconds: phaseStartSeconds,
    endSeconds: phaseEndSeconds,
  });
  const phaseCalibration = calibrateBeatPhaseFromAudioOnsets({
    gridTimes: analysisGridTimes,
    audioOnsets,
    fps,
  });
  const calibratedPhaseTime = phase.phaseTime + phaseCalibration.offsetSeconds;

  const beats = makeGridTimes({
    phaseTime: calibratedPhaseTime,
    periodSeconds,
    startSeconds: outputStartSeconds,
    endSeconds: outputEndSeconds,
  }).map((time, index) => buildGridBeat({
      time,
      index,
      rawBeats,
      tolerance,
      fps,
      videoStartOffset,
      frameCount,
    }));

  return {
    beats,
    phaseCalibration,
  };
}

function calibrateBeatPhaseFromAudioOnsets({
  gridTimes,
  audioOnsets,
  fps,
  maxOffsetFrames = 10,
  clusterToleranceFrames = 1,
  supportThreshold = 0.3,
  minSupportCount = 3,
  minMeaningfulShiftFrames = 2,
}) {
  const normalizedOnsets = normalizeAudioOnsets(audioOnsets);
  const candidateCount = gridTimes.length;
  if (!candidateCount || !normalizedOnsets.length || !Number.isFinite(fps) || fps <= 0) {
    return emptyPhaseCalibration("No audio onset data was available for phase calibration.");
  }

  const maxOffsetSeconds = maxOffsetFrames / fps;
  const bins = new Map();

  for (const gridTime of gridTimes) {
    const nearest = findNearestAudioOnset(gridTime, normalizedOnsets, maxOffsetSeconds);
    if (!nearest) continue;

    const offsetFrames = Math.round((nearest.timestamp_seconds - gridTime) * fps);
    if (Math.abs(offsetFrames) > maxOffsetFrames) continue;

    const current = bins.get(offsetFrames) ?? {
      offsetFrames,
      count: 0,
      weight: 0,
      weightedOffsetSeconds: 0,
    };
    const weight = Math.max(nearest.strength, 0.001);
    current.count += 1;
    current.weight += weight;
    current.weightedOffsetSeconds += (nearest.timestamp_seconds - gridTime) * weight;
    bins.set(offsetFrames, current);
  }

  if (!bins.size) {
    return emptyPhaseCalibration("No nearby audio onsets matched the beat grid.");
  }

  let best = null;
  for (const offsetFrames of bins.keys()) {
    const cluster = Array.from(bins.values())
      .filter((bin) => Math.abs(bin.offsetFrames - offsetFrames) <= clusterToleranceFrames)
      .reduce((acc, bin) => ({
        offsetFrames,
        count: acc.count + bin.count,
        weight: acc.weight + bin.weight,
        weightedOffsetSeconds: acc.weightedOffsetSeconds + bin.weightedOffsetSeconds,
      }), {
        offsetFrames,
        count: 0,
        weight: 0,
        weightedOffsetSeconds: 0,
      });

    if (
      !best
      || cluster.weight > best.weight
      || (
        cluster.weight === best.weight
        && Math.abs(cluster.offsetFrames) < Math.abs(best.offsetFrames)
      )
    ) {
      best = cluster;
    }
  }

  const supportRatio = best.count / candidateCount;
  const weightedOffset = best.weight
    ? best.weightedOffsetSeconds / best.weight
    : best.offsetFrames / fps;
  const offsetFrames = Math.round(weightedOffset * fps);
  const offsetSeconds = roundTime(offsetFrames / fps);
  const hasEnoughSupport = best.count >= minSupportCount && supportRatio >= supportThreshold;
  const hasMeaningfulShift = Math.abs(offsetFrames) >= minMeaningfulShiftFrames;

  return {
    applied: hasEnoughSupport && hasMeaningfulShift,
    offsetSeconds: hasEnoughSupport && hasMeaningfulShift ? offsetSeconds : 0,
    offsetFrames: hasEnoughSupport && hasMeaningfulShift ? offsetFrames : 0,
    suggestedOffsetSeconds: hasEnoughSupport ? offsetSeconds : 0,
    suggestedOffsetFrames: hasEnoughSupport ? offsetFrames : 0,
    candidateCount,
    supportCount: best.count,
    supportRatio: roundTime(supportRatio),
    confidence: roundTime(best.weight / Math.max(candidateCount, 1)),
    source: "audio_onsets",
    warning: hasEnoughSupport && hasMeaningfulShift
      ? ""
      : "Audio onset evidence did not show a meaningful multi-frame phase shift.",
  };
}

function normalizeAudioOnsets(audioOnsets) {
  return audioOnsets
    .map((onset) => {
      if (typeof onset === "number") {
        return {
          timestamp_seconds: onset,
          strength: 1,
        };
      }
      return {
        timestamp_seconds: Number(onset?.timestamp_seconds),
        strength: Number(onset?.strength ?? 1),
      };
    })
    .filter((onset) => Number.isFinite(onset.timestamp_seconds))
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
}

function findNearestAudioOnset(time, audioOnsets, maxDistanceSeconds) {
  let nearest = null;
  for (const onset of audioOnsets) {
    const distance = Math.abs(onset.timestamp_seconds - time);
    if (distance > maxDistanceSeconds) continue;
    if (
      !nearest
      || distance < nearest.distance
      || (
        distance === nearest.distance
        && onset.strength > nearest.strength
      )
    ) {
      nearest = {
        ...onset,
        distance,
      };
    }
  }
  return nearest;
}

function emptyPhaseCalibration(warning = "") {
  return {
    applied: false,
    offsetSeconds: 0,
    offsetFrames: 0,
    suggestedOffsetSeconds: 0,
    suggestedOffsetFrames: 0,
    candidateCount: 0,
    supportCount: 0,
    supportRatio: 0,
    confidence: 0,
    source: "audio_onsets",
    warning,
  };
}

function estimateBeatPeriod(times, minPeriodSeconds, maxPeriodSeconds) {
  const gaps = times
    .slice(1)
    .map((time, index) => time - times[index])
    .filter((gap) => gap > 0);
  if (!gaps.length) return null;

  const candidates = [];
  for (const gap of gaps) {
    const maxDivisor = Math.max(1, Math.round(gap / minPeriodSeconds));
    for (let divisor = 1; divisor <= maxDivisor; divisor += 1) {
      const candidate = gap / divisor;
      if (candidate >= minPeriodSeconds && candidate <= maxPeriodSeconds) {
        candidates.push(candidate);
      }
    }
  }
  if (!candidates.length) return null;

  let best = null;
  for (const candidate of candidates) {
    const score = scoreBeatPeriod(candidate, gaps);
    if (
      !best
      || score.score > best.score
      || (score.score === best.score && score.averageResidual < best.averageResidual)
    ) {
      best = { periodSeconds: candidate, ...score };
    }
  }

  const compatibleGaps = gaps
    .map((gap) => {
      const divisor = Math.max(1, Math.round(gap / best.periodSeconds));
      const normalized = gap / divisor;
      const residual = Math.abs(gap - divisor * best.periodSeconds);
      return residual <= best.periodSeconds * 0.22 ? normalized : null;
    })
    .filter(Number.isFinite);

  return compatibleGaps.length ? median(compatibleGaps) : best.periodSeconds;
}

function scoreBeatPeriod(periodSeconds, gaps) {
  let score = 0;
  let residualSum = 0;
  let alignedCount = 0;
  const tolerance = periodSeconds * 0.22;

  for (const gap of gaps) {
    const multiples = Math.max(1, Math.round(gap / periodSeconds));
    const residual = Math.abs(gap - multiples * periodSeconds);
    if (residual > tolerance) continue;

    alignedCount += 1;
    residualSum += residual;
    score += (1 - residual / tolerance) * (multiples > 1 ? 1.1 : 1);
  }

  return {
    score,
    alignedCount,
    averageResidual: alignedCount ? residualSum / alignedCount : Infinity,
  };
}

function chooseBeatPhase({ beats, periodSeconds, startSeconds, endSeconds, tolerance }) {
  let best = null;

  for (const beat of beats) {
    const gridTimes = makeGridTimes({
      phaseTime: beat.timestamp_seconds,
      periodSeconds,
      startSeconds,
      endSeconds,
    });
    const score = scoreBeatPhase(beats, gridTimes, tolerance);
    const candidate = {
      phaseTime: beat.timestamp_seconds,
      ...score,
    };

    if (
      !best
      || candidate.score > best.score
      || (
        candidate.score === best.score
        && candidate.averageDistance < best.averageDistance
      )
    ) {
      best = candidate;
    }
  }

  return best;
}

function scoreBeatPhase(beats, gridTimes, tolerance) {
  let score = 0;
  let distanceSum = 0;
  let alignedCount = 0;

  for (const beat of beats) {
    const distance = getNearestTimeDistance(beat.timestamp_seconds, gridTimes);
    distanceSum += distance;
    if (distance > tolerance) {
      score -= 0.2;
      continue;
    }

    alignedCount += 1;
    score += (beat.strength ?? 1) * (1 - distance / tolerance);
  }

  return {
    score,
    alignedCount,
    averageDistance: beats.length ? distanceSum / beats.length : Infinity,
  };
}

function makeGridTimes({ phaseTime, periodSeconds, startSeconds, endSeconds }) {
  if (!Number.isFinite(phaseTime) || !Number.isFinite(periodSeconds) || periodSeconds <= 0) {
    return [];
  }

  const start = Math.min(startSeconds, endSeconds);
  const end = Math.max(startSeconds, endSeconds);
  let time = phaseTime + Math.ceil((start - phaseTime) / periodSeconds) * periodSeconds;
  const epsilon = 0.000001;
  if (time < start - epsilon) time += periodSeconds;

  const times = [];
  while (time <= end + epsilon) {
    times.push(roundTime(time));
    time += periodSeconds;
  }
  return dedupeTimes(times);
}

function buildGridBeat({
  time,
  index,
  rawBeats,
  tolerance,
  fps,
  videoStartOffset,
  frameCount,
}) {
  const rawBeat = findNearestRawBeat(time, rawBeats, tolerance);
  const timestamp = roundTime(time);
  const frame = clampFrame(getNearestFrame(timestamp, fps, videoStartOffset), frameCount);

  return {
    number: index + 1,
    timestamp_seconds: timestamp,
    nearest_frame: frame,
    strength: rawBeat ? roundTime(rawBeat.strength ?? 0) : 0,
    source: rawBeat ? "detected" : "inferred",
    raw_beat_number: rawBeat?.number ?? null,
    detected_timestamp_seconds: rawBeat ? roundTime(rawBeat.timestamp_seconds) : null,
    detection_offset_seconds: rawBeat
      ? roundTime(rawBeat.timestamp_seconds - timestamp)
      : null,
    label_frames: Array.from({ length: 5 }, (_, offset) => frame + offset)
      .filter((labelFrame) => labelFrame >= 0 && labelFrame < frameCount),
  };
}

function finalizeGridBeat({
  item,
  index,
  fps,
  videoStartOffset,
  frameCount,
}) {
  const timestamp = roundTime(item.timestamp_seconds);
  const frame = clampFrame(getNearestFrame(timestamp, fps, videoStartOffset), frameCount);

  return {
    number: index + 1,
    timestamp_seconds: timestamp,
    nearest_frame: frame,
    strength: item.source === "detected" ? roundTime(item.strength ?? 0) : 0,
    source: item.source,
    raw_beat_number: item.raw_beat_number ?? null,
    detected_timestamp_seconds: item.detected_timestamp_seconds ?? null,
    detection_offset_seconds: item.detection_offset_seconds ?? null,
    label_frames: Array.from({ length: 5 }, (_, offset) => frame + offset)
      .filter((labelFrame) => labelFrame >= 0 && labelFrame < frameCount),
  };
}

function findNearestRawBeat(time, rawBeats, tolerance) {
  let nearest = null;
  for (const beat of rawBeats) {
    const distance = Math.abs(beat.timestamp_seconds - time);
    if (distance > tolerance) continue;
    if (!nearest || distance < nearest.distance) {
      nearest = { beat, distance };
    }
  }
  return nearest?.beat ?? null;
}

function getNearestTimeDistance(time, times) {
  if (!times.length) return Infinity;
  return times.reduce((nearest, candidate) => {
    const distance = Math.abs(candidate - time);
    return distance < nearest ? distance : nearest;
  }, Infinity);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function dedupeTimes(times) {
  const deduped = [];
  for (const time of times) {
    if (deduped.at(-1) !== time) deduped.push(time);
  }
  return deduped;
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(seconds, 0);
  const totalMilliseconds = Math.round(safeSeconds * 1000);
  const minutes = Math.floor(totalMilliseconds / 60000);
  const wholeSeconds = Math.floor(totalMilliseconds / 1000) % 60;
  const milliseconds = totalMilliseconds % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function getContainRect({ canvasWidth, canvasHeight, videoWidth, videoHeight }) {
  const canvasRatio = canvasWidth / canvasHeight;
  const videoRatio = videoWidth / videoHeight;

  if (videoRatio > canvasRatio) {
    const width = canvasWidth;
    const height = canvasWidth / videoRatio;
    return {
      x: 0,
      y: (canvasHeight - height) / 2,
      width,
      height,
    };
  }

  const height = canvasHeight;
  const width = canvasHeight * videoRatio;
  return {
    x: (canvasWidth - width) / 2,
    y: 0,
    width,
    height,
  };
}

export function mapNormalizedPointToCanvas(point, rect) {
  return {
    x: rect.x + point.x * rect.width,
    y: rect.y + point.y * rect.height,
  };
}
