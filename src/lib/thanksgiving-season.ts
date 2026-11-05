// November begins before the Pacific DST change; December begins after it.
const START = Date.parse('2026-11-01T00:00:00-07:00');
const END = Date.parse('2026-12-01T00:00:00-08:00');

export function isThanksgivingActive(now: number): boolean {
  return now >= START && now < END;
}

export function nextThanksgivingCheck(now: number): number | null {
  if (now >= END) return null;
  return Math.min((now < START ? START : END) - now, 86_400_000);
}
