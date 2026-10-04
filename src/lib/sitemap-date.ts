/** Preserve the recorded day when legacy timestamps have no timezone. */
export function sitemapDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const day = `${y}-${m}-${d}`;
  const parsed = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return undefined;
  if (value === day) return day;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [, time] = value.split(/[ T]/);
    const [h, min, sec] = time.split(":").map(Number);
    return h < 24 && min < 60 && sec < 60 ? day : undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const timestamp = /T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value)!;
  if (Number(timestamp[1]) > 23 || Number(timestamp[2]) > 59 || Number(timestamp[3]) > 59 || Number(timestamp[5] ?? 0) > 23 || Number(timestamp[6] ?? 0) > 59) return undefined;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}

export function postLastModified(post: { updated?: unknown; date?: unknown }) {
  return sitemapDate(post.updated) ?? sitemapDate(post.date);
}
