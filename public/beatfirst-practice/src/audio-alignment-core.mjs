function roundTime(value) {
  return Number(Number(value).toFixed(6));
}

function rmsEnvelope(samples, sampleRate, hopSeconds, windowSeconds) {
  const hop = Math.max(1, Math.round(sampleRate * hopSeconds));
  const window = Math.max(1, Math.round(sampleRate * windowSeconds));
  const frameCount = Math.max(0, Math.floor((samples.length - window) / hop) + 1);
  const envelope = new Float64Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hop;
    let sum = 0;
    for (let index = 0; index < window; index += 1) {
      const value = Number(samples[start + index] || 0);
      sum += value * value;
    }
    envelope[frame] = Math.sqrt(sum / window);
  }

  return envelope;
}

function standardize(values) {
  if (!values.length) return values;
  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / values.length;

  let variance = 0;
  for (const value of values) variance += (value - mean) ** 2;
  const stddev = Math.sqrt(variance / values.length);
  if (stddev <= 1e-12) return new Float64Array(values.length);

  const standardized = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    standardized[index] = (values[index] - mean) / stddev;
  }
  return standardized;
}

function correlationAt(recordingEnvelope, referenceEnvelope, lagFrames) {
  const overlap = Math.min(referenceEnvelope.length, recordingEnvelope.length - lagFrames);
  if (overlap <= 0) return 0;

  let sum = 0;
  let referenceEnergy = 0;
  let recordingEnergy = 0;
  for (let index = 0; index < overlap; index += 1) {
    const reference = referenceEnvelope[index];
    const recording = recordingEnvelope[index + lagFrames];
    sum += reference * recording;
    referenceEnergy += reference * reference;
    recordingEnergy += recording * recording;
  }

  const denominator = Math.sqrt(referenceEnergy * recordingEnergy);
  return denominator > 1e-12 ? sum / denominator : 0;
}

export function estimateReferenceAudioOffset({
  referenceSamples,
  recordingSamples,
  sampleRate,
  expectedOffsetSeconds,
  searchRadiusSeconds = 0.75,
  hopSeconds = 0.005,
  windowSeconds = 0.025,
  minCorrelation = 0.35,
  lowConfidenceMinCorrelation = 0.2,
  lowConfidenceMaxDeltaSeconds = 0.2,
} = {}) {
  if (!referenceSamples?.length || !recordingSamples?.length || !Number.isFinite(sampleRate)) {
    return {
      applied: false,
      offsetSeconds: roundTime(expectedOffsetSeconds || 0),
      deltaSeconds: 0,
      correlation: 0,
      warning: "Audio alignment needs reference and recording samples.",
    };
  }

  const referenceEnvelope = standardize(rmsEnvelope(referenceSamples, sampleRate, hopSeconds, windowSeconds));
  const recordingEnvelope = standardize(rmsEnvelope(recordingSamples, sampleRate, hopSeconds, windowSeconds));
  const expectedLag = Math.round(expectedOffsetSeconds / hopSeconds);
  const radius = Math.round(searchRadiusSeconds / hopSeconds);
  const startLag = Math.max(0, expectedLag - radius);
  const endLag = Math.min(recordingEnvelope.length - 1, expectedLag + radius);

  let bestLag = expectedLag;
  let bestCorrelation = -Infinity;
  for (let lag = startLag; lag <= endLag; lag += 1) {
    const correlation = correlationAt(recordingEnvelope, referenceEnvelope, lag);
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  const offsetSeconds = roundTime(bestLag * hopSeconds);
  const deltaSeconds = roundTime(offsetSeconds - expectedOffsetSeconds);
  const lowConfidenceMatch = bestCorrelation >= lowConfidenceMinCorrelation
    && Math.abs(deltaSeconds) <= lowConfidenceMaxDeltaSeconds;

  if (
    !Number.isFinite(bestCorrelation)
    || (bestCorrelation < minCorrelation && !lowConfidenceMatch)
  ) {
    return {
      applied: false,
      offsetSeconds: roundTime(expectedOffsetSeconds),
      deltaSeconds: 0,
      correlation: roundTime(Math.max(bestCorrelation, 0)),
      warning: "Could not verify audio timing from the mic calibration track.",
    };
  }

  return {
    applied: true,
    offsetSeconds,
    deltaSeconds,
    correlation: roundTime(bestCorrelation),
    warning: "",
  };
}
