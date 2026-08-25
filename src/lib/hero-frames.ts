export function getInitialFrameIndices(totalFrames: number, count: number): number[] {
  if (totalFrames <= 0 || count <= 0) return [];
  if (totalFrames <= count) {
    return Array.from({ length: totalFrames }, (_, index) => index);
  }
  if (count === 1) return [0];

  return Array.from({ length: count }, (_, index) =>
    Math.round((index * (totalFrames - 1)) / (count - 1))
  );
}

export function getFrameNeighborhood(
  currentFrame: number,
  totalFrames: number,
  framesBehind = 2,
  framesAhead = 6
): number[] {
  if (totalFrames <= 0) return [];

  const current = Math.min(totalFrames - 1, Math.max(0, Math.round(currentFrame)));
  const indices = [current];

  for (let offset = 1; offset <= framesBehind; offset += 1) {
    if (current - offset >= 0) indices.push(current - offset);
  }
  for (let offset = 1; offset <= framesAhead; offset += 1) {
    if (current + offset < totalFrames) indices.push(current + offset);
  }

  return indices;
}
