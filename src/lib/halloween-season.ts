// Explicit Pacific offsets: DST does not end until 02:00 on November 1.
const START = Date.parse('2026-10-26T00:00:00-07:00');
const END = Date.parse('2026-11-01T00:00:00-07:00');

export function isHalloweenActive(now: number): boolean {
  return now >= START && now < END;
}

export function nextHalloweenCheck(now: number): number | null {
  if (now >= END) return null;
  // Stay below browser timeout limits even when the page is opened months early.
  return Math.min((now < START ? START : END) - now, 86_400_000);
}
