const DEFAULT_OPTIONS = {
  minVisibility: 0.2,
  smoothingRadius: 2,
  groundQuantile: 0.9,
  liftBaselineQuantile: 0.1,
  contactHoldFrames: 3,
  liftHoldFrames: 3,
  approachLookbackFrames: 10,
  minContactSeparationFrames: 8,
  contextPaddingFrames: 0,
  recoverMissingBeatContacts: false,
  recoverLateralContacts: false,
  beatContactToleranceFrames: 5,
  beatContactRecoveryWindowFrames: 5,
};

const FOOT_DEFINITIONS = [
  {
    foot: "left",
    pointName: "left_front_foot",
    supportPointNames: ["left_heel", "left_ankle"],
  },
  {
    foot: "right",
    pointName: "right_front_foot",
    supportPointNames: ["right_heel", "right_ankle"],
  },
];

export function detectContacts(poseData, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const fps = poseData.fps || 60;
  const sourceFrames = poseData.frames || [];
  const scoringFrameRange = normalizeFrameRange(sourceFrames, settings.frameRange);
  const frames = getFramesInRange(sourceFrames, scoringFrameRange, settings.contextPaddingFrames);
  let contacts = FOOT_DEFINITIONS
    .flatMap((definition) => detectFootContacts({
      frames,
      fps,
      definition,
      settings,
    }))
    .filter((contact) => isFrameInsideRange(contact.frame, scoringFrameRange))
    .sort((a, b) => a.frame - b.frame || a.foot.localeCompare(b.foot));

  if (settings.recoverMissingBeatContacts && Array.isArray(settings.beats)) {
    contacts = recoverMissingBeatContacts({
      frames,
      contacts,
      fps,
      scoringFrameRange,
      settings,
    });
  }

  return contacts.map((contact, index) => ({
    number: index + 1,
    foot: contact.foot,
    frame: contact.frame,
    timestamp_seconds: roundTime(contact.timestamp_seconds),
    confidence: contact.confidence,
    source: contact.source ?? "front_foot_contact",
    manually_adjusted: false,
  }));
}

export function getActiveContactLabel(frame, contacts, holdFrames = 5, options = {}) {
  const activeContact = contacts.find((contact) => (
    frame >= contact.frame && frame < contact.frame + holdFrames
  ));
  if (!activeContact) return "";
  const holdFrameIndex = frame - activeContact.frame + 1;
  const label = `Contact #${activeContact.number}-${holdFrameIndex}`;
  return options.includeFoot === false ? label : `${label} - ${capitalize(activeContact.foot)}`;
}

function detectFootContacts({ frames, fps, definition, settings }) {
  const rawValues = frames.map((frame) => {
    const point = frame.points?.[definition.pointName];
    if (!point || point.visibility < settings.minVisibility) return null;
    return point.y;
  });
  const supportTraces = buildSupportTraces({ frames, definition, settings });
  const filledValues = fillMissingValues(rawValues);
  const smoothedValues = smoothValues(filledValues, settings.smoothingRadius);
  const validValues = smoothedValues.filter(Number.isFinite);
  if (validValues.length < settings.contactHoldFrames + settings.liftHoldFrames) return [];

  const liftBaselineY = percentile(validValues, settings.liftBaselineQuantile);
  const groundY = percentile(validValues, settings.groundQuantile);
  const range = Math.max(groundY - liftBaselineY, 0.001);
  const contactThreshold = settings.contactThreshold ?? Math.max(0.012, range * 0.18);
  const liftThreshold = settings.liftThreshold ?? Math.max(contactThreshold * 2.3, range * 0.32, 0.035);
  const minApproachDistance = settings.minApproachDistance ?? Math.max(range * 0.22, 0.028);
  const reliftThreshold = settings.reliftThreshold ?? Math.max(contactThreshold, minApproachDistance * 0.65, 0.018);
  const localSettleDelta = settings.localSettleDelta ?? Math.max(range * 0.035, 0.003);

  const contacts = [];
  let readyForContact = false;
  let liftedFrames = 0;
  let lastContactFrame = -Infinity;
  let lastContactY = null;

  for (let frameIndex = 0; frameIndex < smoothedValues.length; frameIndex += 1) {
    const y = smoothedValues[frameIndex];
    if (!Number.isFinite(y)) continue;

    const lifted = lastContactY === null
      ? y <= groundY - liftThreshold
      : y <= lastContactY - reliftThreshold;

    if (lifted) {
      liftedFrames += 1;
      if (liftedFrames >= settings.liftHoldFrames) readyForContact = true;
    } else {
      liftedFrames = 0;
    }

    if (!readyForContact) continue;
    if (frameIndex - lastContactFrame < settings.minContactSeparationFrames) continue;

    const approachDistance = getApproachDistance(
      smoothedValues,
      frameIndex,
      settings.approachLookbackFrames,
    );
    if (approachDistance < minApproachDistance) continue;
    if (!isLocalLanding(smoothedValues, frameIndex, localSettleDelta, settings.contactHoldFrames)) {
      continue;
    }

    const contactFrameIndex = findFirstTouchFrame({
      smoothedValues,
      frameIndex,
      contactThreshold,
      localSettleDelta,
      settings,
      supportTraces,
    });
    const timestamp = frames[contactFrameIndex]?.timestamp_seconds ?? contactFrameIndex / fps;
    contacts.push({
      foot: definition.foot,
      frame: frames[contactFrameIndex]?.frame ?? contactFrameIndex,
      timestamp_seconds: timestamp,
      confidence: scoreContact({
        smoothedValues,
        frameIndex,
        groundY,
        contactThreshold,
        approachDistance,
        minApproachDistance,
        holdFrames: settings.contactHoldFrames,
      }),
      source: "front_foot_contact",
    });
    readyForContact = false;
    lastContactFrame = frameIndex;
    lastContactY = y;
    liftedFrames = 0;
  }

  return contacts;
}

function buildSupportTraces({ frames, definition, settings }) {
  return (definition.supportPointNames || [])
    .map((pointName) => {
      const rawValues = frames.map((frame) => {
        const point = frame.points?.[pointName];
        if (!point || point.visibility < settings.minVisibility) return null;
        return point.y;
      });
      const smoothedValues = smoothValues(fillMissingValues(rawValues), settings.smoothingRadius);
      const validValues = smoothedValues.filter(Number.isFinite);
      if (!validValues.length) return null;
      const lowY = percentile(validValues, 0.1);
      const highY = percentile(validValues, 0.9);
      return {
        pointName,
        smoothedValues,
        range: Math.max(highY - lowY, 0.001),
      };
    })
    .filter(Boolean);
}

function findFirstTouchFrame({
  smoothedValues,
  frameIndex,
  contactThreshold,
  localSettleDelta,
  settings,
  supportTraces,
}) {
  const confirmedY = smoothedValues[frameIndex];
  if (!Number.isFinite(confirmedY)) return frameIndex;

  const touchBand = Math.max(contactThreshold * 0.65, localSettleDelta * 2.2, 0.004);
  const touchThreshold = confirmedY - touchBand;
  const startFrame = Math.max(0, frameIndex - settings.approachLookbackFrames);
  let firstTouchFrame = frameIndex;

  for (let candidateFrame = frameIndex; candidateFrame >= startFrame; candidateFrame -= 1) {
    const candidateY = smoothedValues[candidateFrame];
    if (!Number.isFinite(candidateY) || candidateY < touchThreshold) break;
    if (!staysInTouchZone({
      smoothedValues,
      candidateFrame,
      frameIndex,
      touchThreshold,
      holdFrames: settings.contactHoldFrames,
    })) {
      continue;
    }
    if (!hasSupportNearConfirmedPosition({
      supportTraces,
      candidateFrame,
      frameIndex,
    })) {
      continue;
    }
    firstTouchFrame = candidateFrame;
  }

  return firstTouchFrame;
}

function staysInTouchZone({
  smoothedValues,
  candidateFrame,
  frameIndex,
  touchThreshold,
  holdFrames,
}) {
  const endFrame = Math.min(frameIndex, candidateFrame + Math.max(0, holdFrames - 1));
  for (let index = candidateFrame; index <= endFrame; index += 1) {
    const y = smoothedValues[index];
    if (!Number.isFinite(y) || y < touchThreshold) return false;
  }
  return true;
}

function hasSupportNearConfirmedPosition({
  supportTraces,
  candidateFrame,
  frameIndex,
}) {
  if (!supportTraces.length) return true;
  return supportTraces.some((trace) => {
    const candidateY = trace.smoothedValues[candidateFrame];
    const confirmedY = trace.smoothedValues[frameIndex];
    if (!Number.isFinite(candidateY) || !Number.isFinite(confirmedY)) return false;
    const supportBand = Math.max(trace.range * 0.3, 0.012);
    return candidateY >= confirmedY - supportBand;
  });
}

function recoverMissingBeatContacts({ frames, contacts, fps, scoringFrameRange, settings }) {
  const recoveredContacts = [...contacts];
  const tracesByFoot = new Map(FOOT_DEFINITIONS.map((definition) => [
    definition.foot,
    buildFootTrace({ frames, fps, definition, settings }),
  ]));

  const scoredBeats = settings.beats
    .map((beat) => ({ ...beat, frame: getBeatFrame(beat, fps) }))
    .filter((beat) => Number.isFinite(beat.frame) && isFrameInsideRange(beat.frame, scoringFrameRange))
    .sort((a, b) => a.frame - b.frame);
  const existingContactWindowFrames = settings.existingContactWindowFrames
    ?? Math.max(settings.beatContactToleranceFrames, settings.beatContactRecoveryWindowFrames * 2);

  for (const beat of scoredBeats) {
    if (findContactForBeat(recoveredContacts, beat, scoredBeats, existingContactWindowFrames)) {
      continue;
    }

    const expectedFoot = getExpectedFootForBeat({
      beat,
      contacts: recoveredContacts,
      beatFrame: beat.frame,
      settings,
    });
    const candidateDefinitions = expectedFoot
      ? FOOT_DEFINITIONS.filter((definition) => definition.foot === expectedFoot)
      : FOOT_DEFINITIONS;
    const stableFirstContactWindowFrames = settings.stableFirstContactWindowFrames
      ?? Math.max(settings.contactHoldFrames, 2);
    const allowStableFirstContact = !recoveredContacts.some((contact) => contact.frame < beat.frame)
      && beat.frame - scoringFrameRange.startFrame <= stableFirstContactWindowFrames;
    const candidate = findBeatGuidedContactCandidate({
      beat,
      candidateDefinitions,
      tracesByFoot,
      scoringFrameRange,
      settings,
      allowStableFirstContact,
    });

    if (!candidate) continue;
    recoveredContacts.push(candidate);
    recoveredContacts.sort((a, b) => a.frame - b.frame || a.foot.localeCompare(b.foot));
  }

  return recoveredContacts;
}

function findBeatGuidedContactCandidate({
  beat,
  candidateDefinitions,
  tracesByFoot,
  scoringFrameRange,
  settings,
  allowStableFirstContact,
}) {
  const windowFrames = settings.beatContactRecoveryWindowFrames;
  const minRecoveryApproachDistance = settings.recoveryMinApproachDistance
    ?? Math.max((settings.minApproachDistance ?? 0.028) * 0.45, 0.012);
  const candidates = [];

  for (const definition of candidateDefinitions) {
    const trace = tracesByFoot.get(definition.foot);
    if (!trace?.valid) continue;

    const startFrame = Math.max(scoringFrameRange.startFrame, beat.frame - windowFrames);
    const endFrame = Math.min(scoringFrameRange.endFrame, beat.frame + windowFrames);
    for (let frame = startFrame; frame <= endFrame; frame += 1) {
      const frameIndex = trace.frameToIndex.get(frame);
      if (!Number.isInteger(frameIndex)) continue;
      if (!hasVisibleFootPoint(trace, frameIndex)) continue;

      const approachDistance = getApproachDistance(
        trace.smoothedValues,
        frameIndex,
        settings.approachLookbackFrames,
      );
      const recentApproachDistance = getApproachDistance(
        trace.smoothedValues,
        frameIndex,
        settings.recoveryRecentApproachLookbackFrames ?? Math.max(settings.contactHoldFrames + 1, 3),
      );
      const minRecentRecoveryApproachDistance = settings.recoveryMinRecentApproachDistance
        ?? Math.max(minRecoveryApproachDistance * 0.7, 0.008);
      const isLanding = isLocalLanding(
        trace.smoothedValues,
        frameIndex,
        trace.localSettleDelta,
        settings.contactHoldFrames,
      );
      const isStableStart = allowStableFirstContact && isStableContactCandidate({
        trace,
        frameIndex,
        settings,
      });
      const verticalCandidate = (isLanding || isStableStart)
        && (isStableStart || (
          approachDistance >= minRecoveryApproachDistance
          && recentApproachDistance >= minRecentRecoveryApproachDistance
        ))
        ? buildVerticalBeatGuidedCandidate({
          definition,
          trace,
          frame,
          frameIndex,
          beat,
          windowFrames,
          approachDistance,
          minRecoveryApproachDistance,
          settings,
          isStableStart,
        })
        : null;
      const lateralCandidate = !verticalCandidate && settings.recoverLateralContacts
        ? buildLateralBeatGuidedCandidate({
          definition,
          trace,
          frame,
          frameIndex,
          beat,
          windowFrames,
          settings,
        })
        : null;
      const candidate = verticalCandidate || lateralCandidate;
      if (!candidate) continue;

      candidates.push(candidate);
    }
  }

  if (!candidates.length) return null;
  return candidates
    .sort((a, b) => b.score - a.score || Math.abs(a.frame - beat.frame) - Math.abs(b.frame - beat.frame))[0];
}

function buildVerticalBeatGuidedCandidate({
  definition,
  trace,
  frame,
  frameIndex,
  beat,
  windowFrames,
  approachDistance,
  minRecoveryApproachDistance,
  settings,
  isStableStart,
}) {
  const timestamp = trace.frames[frameIndex]?.timestamp_seconds ?? frame / trace.fps;
  const confidence = scoreContact({
    smoothedValues: trace.smoothedValues,
    frameIndex,
    groundY: trace.groundY,
    contactThreshold: trace.contactThreshold,
    approachDistance: Math.max(approachDistance, minRecoveryApproachDistance),
    minApproachDistance: minRecoveryApproachDistance,
    holdFrames: settings.contactHoldFrames,
  });
  const closenessScore = 1 - (Math.abs(frame - beat.frame) / Math.max(windowFrames + 1, 1));
  return {
    foot: definition.foot,
    frame,
    timestamp_seconds: timestamp,
    confidence: roundTime((confidence * 0.82) + (closenessScore * 0.18)),
    source: "beat_guided_front_foot_contact",
    score: (confidence * 0.9) + (closenessScore * 0.1) + (isStableStart ? 0.08 : 0),
  };
}

function buildLateralBeatGuidedCandidate({
  definition,
  trace,
  frame,
  frameIndex,
  beat,
  windowFrames,
  settings,
}) {
  const lateralScore = scoreLateralArrival({ trace, frameIndex, settings });
  if (!lateralScore) return null;

  const arrivalFrameIndex = findFirstLateralArrivalFrame({ trace, frameIndex, settings });
  const arrivalFrame = trace.frames[arrivalFrameIndex]?.frame ?? frame;
  const timestamp = trace.frames[arrivalFrameIndex]?.timestamp_seconds ?? arrivalFrame / trace.fps;
  const closenessScore = 1 - (Math.abs(arrivalFrame - beat.frame) / Math.max(windowFrames + 1, 1));
  const confidence = roundTime((lateralScore * 0.82) + (closenessScore * 0.18));
  return {
    foot: definition.foot,
    frame: arrivalFrame,
    timestamp_seconds: timestamp,
    confidence,
    source: "beat_guided_lateral_contact",
    score: (lateralScore * 0.9) + (closenessScore * 0.1),
  };
}

function scoreLateralArrival({ trace, frameIndex, settings }) {
  const x = trace.smoothedXValues?.[frameIndex];
  if (!Number.isFinite(x)) return null;

  const lookbackFrames = settings.lateralLookbackFrames ?? settings.approachLookbackFrames;
  const settleFrames = settings.lateralSettleFrames ?? Math.max(settings.contactHoldFrames, 2);
  const startFrame = Math.max(0, frameIndex - lookbackFrames);
  const endFrame = Math.min(trace.smoothedXValues.length - 1, frameIndex + settleFrames);
  const previousValues = trace.smoothedXValues
    .slice(startFrame, frameIndex + 1)
    .filter(Number.isFinite);
  const futureValues = trace.smoothedXValues
    .slice(frameIndex, endFrame + 1)
    .filter(Number.isFinite);
  if (previousValues.length < 2 || futureValues.length < Math.min(settleFrames + 1, 2)) {
    return null;
  }

  const previousMinX = Math.min(...previousValues);
  const previousMaxX = Math.max(...previousValues);
  const lateralTravel = Math.max(Math.abs(x - previousMinX), Math.abs(x - previousMaxX));
  const minLateralTravel = settings.lateralMinTravel ?? Math.max(trace.lateralRange * 0.18, 0.035);
  if (lateralTravel < minLateralTravel) return null;

  const recentLookbackFrames = settings.lateralRecentLookbackFrames
    ?? Math.max(settings.contactHoldFrames + 1, 3);
  const recentStartFrame = Math.max(0, frameIndex - recentLookbackFrames);
  const recentValues = trace.smoothedXValues
    .slice(recentStartFrame, frameIndex + 1)
    .filter(Number.isFinite);
  if (recentValues.length < 2) return null;

  const recentTravel = Math.max(...recentValues) - Math.min(...recentValues);
  const minRecentTravel = settings.lateralMinRecentTravel
    ?? Math.max(minLateralTravel * 0.35, trace.lateralRange * 0.06, 0.01);
  if (recentTravel < minRecentTravel) return null;

  const localValues = trace.smoothedXValues
    .slice(startFrame, endFrame + 1)
    .filter(Number.isFinite);
  const localMinX = Math.min(...localValues);
  const localMaxX = Math.max(...localValues);
  const endpointTolerance = settings.lateralEndpointTolerance ?? Math.max(trace.lateralRange * 0.035, 0.006);
  const isLateralEndpoint = Math.abs(x - localMinX) <= endpointTolerance
    || Math.abs(x - localMaxX) <= endpointTolerance;

  const futureRange = Math.max(...futureValues) - Math.min(...futureValues);
  const isSettled = futureRange <= trace.localLateralSettleDelta;
  if (!isLateralEndpoint && !isSettled) return null;

  const travelScore = clamp01(lateralTravel / Math.max(minLateralTravel * 1.75, 0.001));
  const recentTravelScore = clamp01(recentTravel / Math.max(minLateralTravel * 2, 0.001));
  const endpointScore = isLateralEndpoint ? 1 : 0.55;
  const settleScore = clamp01(1 - (futureRange / Math.max(trace.localLateralSettleDelta * 1.8, 0.001)));
  return roundTime(
    (travelScore * 0.30)
    + (recentTravelScore * 0.25)
    + (endpointScore * 0.20)
    + (settleScore * 0.25),
  );
}

function findFirstLateralArrivalFrame({ trace, frameIndex, settings }) {
  const endpointX = trace.smoothedXValues?.[frameIndex];
  if (!Number.isFinite(endpointX)) return frameIndex;

  const arrivalBand = settings.lateralArrivalBand
    ?? Math.max(trace.localLateralSettleDelta * 0.25, 0.003);
  const startFrame = Math.max(0, frameIndex - (settings.lateralLookbackFrames ?? settings.approachLookbackFrames));
  let arrivalFrameIndex = frameIndex;

  for (let candidateFrame = frameIndex - 1; candidateFrame >= startFrame; candidateFrame -= 1) {
    const candidateX = trace.smoothedXValues[candidateFrame];
    if (!Number.isFinite(candidateX) || Math.abs(candidateX - endpointX) > arrivalBand) break;
    arrivalFrameIndex = candidateFrame;
  }

  return arrivalFrameIndex;
}

function buildFootTrace({ frames, fps, definition, settings }) {
  const rawValues = frames.map((frame) => {
    const point = frame.points?.[definition.pointName];
    if (!point || point.visibility < settings.minVisibility) return null;
    return point.y;
  });
  const rawXValues = frames.map((frame) => {
    const point = frame.points?.[definition.pointName];
    if (!point || point.visibility < settings.minVisibility) return null;
    return point.x;
  });
  const filledValues = fillMissingValues(rawValues);
  const filledXValues = fillMissingValues(rawXValues);
  const smoothedValues = smoothValues(filledValues, settings.smoothingRadius);
  const smoothedXValues = smoothValues(filledXValues, settings.smoothingRadius);
  const validValues = smoothedValues.filter(Number.isFinite);
  const validXValues = smoothedXValues.filter(Number.isFinite);
  if (validValues.length < settings.contactHoldFrames) {
    return { valid: false };
  }

  const liftBaselineY = percentile(validValues, settings.liftBaselineQuantile);
  const groundY = percentile(validValues, settings.groundQuantile);
  const range = Math.max(groundY - liftBaselineY, 0.001);
  const contactThreshold = settings.contactThreshold ?? Math.max(0.012, range * 0.18);
  const localSettleDelta = settings.localSettleDelta ?? Math.max(range * 0.035, 0.003);
  const lowX = validXValues.length ? percentile(validXValues, 0.1) : 0;
  const highX = validXValues.length ? percentile(validXValues, 0.9) : 0;
  const lateralRange = Math.max(highX - lowX, 0.001);
  const localLateralSettleDelta = settings.localLateralSettleDelta
    ?? Math.max(lateralRange * 0.04, 0.006);

  return {
    valid: true,
    fps,
    frames,
    rawValues,
    rawXValues,
    smoothedValues,
    smoothedXValues,
    groundY,
    contactThreshold,
    localSettleDelta,
    lateralRange,
    localLateralSettleDelta,
    frameToIndex: new Map(frames.map((frame, index) => [frame.frame ?? index, index])),
  };
}

function isStableContactCandidate({ trace, frameIndex, settings }) {
  const y = trace.smoothedValues[frameIndex];
  if (!Number.isFinite(y)) return false;
  return isLocalLanding(trace.smoothedValues, frameIndex, trace.localSettleDelta, settings.contactHoldFrames);
}

function inferExpectedFoot({ contacts, beatFrame }) {
  const previousContact = [...contacts].reverse().find((contact) => contact.frame < beatFrame);
  const nextContact = contacts.find((contact) => contact.frame > beatFrame);

  if (!previousContact && nextContact) return oppositeFoot(nextContact.foot);
  if (previousContact && nextContact && previousContact.foot === nextContact.foot) {
    return oppositeFoot(previousContact.foot);
  }
  return null;
}

function getExpectedFootForBeat({ beat, contacts, beatFrame, settings }) {
  if (settings.useBeatFootHints && FOOT_DEFINITIONS.some((definition) => definition.foot === beat.foot)) {
    return beat.foot;
  }
  return inferExpectedFoot({ contacts, beatFrame });
}

function findContactForBeat(contacts, beat, beats, toleranceFrames) {
  return contacts.find((contact) => {
    if (Math.abs(contact.frame - beat.frame) > toleranceFrames) return false;
    return getNearestBeat(beats, contact.frame)?.frame === beat.frame;
  });
}

function getNearestBeat(beats, frame) {
  return beats.reduce((nearest, beat) => {
    if (!nearest) return beat;
    const distance = Math.abs(beat.frame - frame);
    const nearestDistance = Math.abs(nearest.frame - frame);
    if (distance < nearestDistance) return beat;
    return nearest;
  }, null);
}

function getBeatFrame(beat, fps) {
  if (Number.isFinite(beat.nearest_frame)) return beat.nearest_frame;
  if (Number.isFinite(beat.frame)) return beat.frame;
  if (Number.isFinite(beat.timestamp_seconds)) return Math.round(beat.timestamp_seconds * fps);
  return null;
}

function hasVisibleFootPoint(trace, frameIndex) {
  const y = trace.rawValues[frameIndex];
  return Number.isFinite(y);
}

function normalizeFrameRange(frames, frameRange) {
  if (!frames.length) return { startFrame: 0, endFrame: -1 };
  const sourceFrameNumbers = frames.map((frame, index) => frame.frame ?? index);
  const firstFrame = Math.min(...sourceFrameNumbers);
  const lastFrame = Math.max(...sourceFrameNumbers);
  if (!frameRange) return { startFrame: firstFrame, endFrame: lastFrame };

  return {
    startFrame: Math.max(firstFrame, frameRange.startFrame ?? firstFrame),
    endFrame: Math.min(lastFrame, frameRange.endFrame ?? lastFrame),
  };
}

function getFramesInRange(frames, frameRange, contextPaddingFrames = 0) {
  const startFrame = frameRange.startFrame - contextPaddingFrames;
  const endFrame = frameRange.endFrame;
  return frames.filter((frame, index) => {
    const sourceFrame = frame.frame ?? index;
    return sourceFrame >= startFrame && sourceFrame <= endFrame;
  });
}

function isFrameInsideRange(frame, frameRange) {
  return frame >= frameRange.startFrame && frame <= frameRange.endFrame;
}

function isLocalLanding(values, startFrame, settleDelta, holdFrames) {
  const y = values[startFrame];
  if (!Number.isFinite(y)) return false;

  const stableValues = values
    .slice(startFrame, startFrame + holdFrames)
    .filter(Number.isFinite);
  if (stableValues.length < holdFrames) return false;

  const maxFutureY = Math.max(...stableValues);
  const minFutureY = Math.min(...stableValues);
  const futureDescent = maxFutureY - y;
  const futureRange = maxFutureY - minFutureY;

  return futureDescent <= settleDelta && futureRange <= settleDelta * 2.2;
}

function getApproachDistance(values, frameIndex, lookbackFrames) {
  const start = Math.max(0, frameIndex - lookbackFrames);
  const recentValues = values.slice(start, frameIndex + 1).filter(Number.isFinite);
  if (!recentValues.length) return 0;
  return values[frameIndex] - Math.min(...recentValues);
}

function scoreContact({
  smoothedValues,
  frameIndex,
  groundY,
  contactThreshold,
  approachDistance,
  minApproachDistance,
  holdFrames,
}) {
  const contactDepth = clamp01((smoothedValues[frameIndex] - (groundY - contactThreshold)) / contactThreshold);
  const approachScore = clamp01(approachDistance / Math.max(minApproachDistance * 1.5, 0.001));
  const stableValues = smoothedValues.slice(frameIndex, frameIndex + holdFrames).filter(Number.isFinite);
  const maxDeviation = Math.max(...stableValues.map((value) => Math.abs(value - groundY)), 0);
  const stabilityScore = clamp01(1 - (maxDeviation / Math.max(contactThreshold * 2, 0.001)));

  return roundTime((contactDepth * 0.35) + (approachScore * 0.35) + (stabilityScore * 0.30));
}

function fillMissingValues(values) {
  const filled = [...values];
  let lastValid = null;
  for (let index = 0; index < filled.length; index += 1) {
    if (Number.isFinite(filled[index])) {
      lastValid = filled[index];
    } else if (lastValid !== null) {
      filled[index] = lastValid;
    }
  }

  const firstValid = filled.find(Number.isFinite);
  return filled.map((value) => (Number.isFinite(value) ? value : firstValid));
}

function smoothValues(values, radius) {
  if (radius <= 0) return values;
  return values.map((_, index) => {
    const nearby = values
      .slice(Math.max(0, index - radius), Math.min(values.length, index + radius + 1))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!nearby.length) return null;
    return nearby[Math.floor(nearby.length / 2)];
  });
}

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * quantile)));
  return sorted[index];
}

function roundTime(value) {
  return Number(value.toFixed(6));
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function oppositeFoot(foot) {
  return foot === "left" ? "right" : "left";
}
