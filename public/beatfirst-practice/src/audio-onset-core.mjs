import {
  roundTime,
} from "./player-core.mjs";

export function extractAudioOnsetPeaks({
  samples,
  sampleRate,
  frameSize = 1024,
  hopSize = 256,
  minSpacingSeconds = 0.08,
}) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return [];
  if (!Number.isFinite(frameSize) || frameSize <= 0 || !Number.isFinite(hopSize) || hopSize <= 0) {
    return [];
  }

  const energies = [];
  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    let sum = 0;
    for (let index = start; index < start + frameSize; index += 1) {
      const sample = samples[index] || 0;
      sum += sample * sample;
    }
    energies.push({
      time: start / sampleRate,
      rms: Math.sqrt(sum / frameSize),
    });
  }

  if (energies.length < 3) return [];

  const strengths = energies.map((energy, index) => {
    if (index === 0) return 0;
    const previous = energies[index - 1].rms;
    return Math.max(0, Math.log10(energy.rms + 1e-8) - Math.log10(previous + 1e-8));
  });
  const positiveStrengths = strengths.filter((strength) => strength > 0);
  const candidates = [];

  if (positiveStrengths.length) {
    const maxStrength = Math.max(...positiveStrengths);
    const threshold = Math.max(
      percentile(positiveStrengths, 0.65),
      maxStrength * 0.18,
    );
    for (let index = 1; index < strengths.length - 1; index += 1) {
      const strength = strengths[index];
      if (strength < threshold) continue;
      if (strength < strengths[index - 1] || strength < strengths[index + 1]) continue;
      candidates.push({
        timestamp_seconds: roundTime(energies[index].time),
        strength: strength / maxStrength,
      });
    }
  }

  const rmsValues = energies.map((energy) => energy.rms);
  const maxRms = Math.max(...rmsValues);
  const minRms = Math.min(...rmsValues);
  const energyThreshold = Math.max(
    percentile(rmsValues, 0.85),
    maxRms * 0.35,
  );

  if (maxRms > 0 && maxRms - minRms > maxRms * 0.05) {
    for (let index = 1; index < energies.length - 1; index += 1) {
      const rms = energies[index].rms;
      if (rms < energyThreshold) continue;
      if (rms < energies[index - 1].rms || rms < energies[index + 1].rms) continue;
      candidates.push({
        timestamp_seconds: roundTime(energies[index].time),
        strength: rms / maxRms,
      });
    }
  }

  if (!candidates.length) return [];
  const spaced = enforceMinimumSpacing(candidates, minSpacingSeconds);
  const strongest = Math.max(...spaced.map((peak) => peak.strength), 1);
  return spaced.map((peak) => ({
    timestamp_seconds: peak.timestamp_seconds,
    strength: roundTime(peak.strength / strongest),
    source: "amplitude_attack",
  }));
}

function enforceMinimumSpacing(candidates, minSpacingSeconds) {
  const selected = [];
  for (const candidate of candidates) {
    const previous = selected.at(-1);
    if (!previous || candidate.timestamp_seconds - previous.timestamp_seconds >= minSpacingSeconds) {
      selected.push(candidate);
      continue;
    }

    if (candidate.strength > previous.strength) {
      selected[selected.length - 1] = candidate;
    }
  }
  return selected;
}

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * quantile)),
  );
  return sorted[index];
}
