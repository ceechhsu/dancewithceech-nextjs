import inventory from "@/content/approved-pages/dance-lessons.json";
import { publicLessons, type DanceLesson } from "./dance-lessons";
import type { PlaylistSnapshot } from "./teaching-playlist";

const known = new Map(inventory.map(item => [item.publishedVideoID, item]));
const liveDates = new Map(inventory.map(item => [item.sourceID, item.actualLiveDate]));
function reference(description: string) {
  for (const text of description.match(/https?:\/\/[^\s<>]+/g) ?? []) {
    try {
      const url = new URL(text.replace(/[),.;]+$/, ""));
      if (!["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname)) continue;
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
      const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
      if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? "") || !raw) continue;
      const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/);
      const seconds = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : parts && parts.slice(1).some(Boolean) ? Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0) : NaN;
      if (Number.isFinite(seconds) && seconds >= 0) return { sourceID: id!, timestamp: seconds };
    } catch { /* A malformed reference is never converted into invented source metadata. */ }
  }
  return { sourceID: null, timestamp: null };
}
function explicitLiveDate(description: string, checkedAt: string) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const match = description.match(new RegExp(`\\b(?:from (?:my |the )?|recorded live (?:on )?)(${months.join("|")}) (\\d{1,2}),? (20\\d{2})\\b`, "i"));
  if (!match) return null;
  const month = months.findIndex(value => value.toLowerCase() === match[1].toLowerCase()) + 1;
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().startsWith(date) && parsed.valueOf() <= Date.parse(checkedAt) ? date : null;
}

/** Old inventory may enrich a member; it can never add a member. */
export function playlistLessons(snapshot: PlaylistSnapshot): DanceLesson[] {
  return publicLessons(snapshot.videos.map(video => {
    const existing = known.get(video.publishedVideoID);
    const ref = existing ? { sourceID: existing.sourceID, timestamp: existing.timestamp } : reference(video.description);
    const firstLine = video.description.split(/\r?\n/).find(line => line.trim())?.trim() ?? "";
    const cue = existing?.practiceCue ?? (firstLine.length <= 600 && firstLine && !/^(?:https?:|#|Full (?:lesson|warm-up):)/i.test(firstLine) ? firstLine : "Watch the tip, pause, and practice at your own pace.");
    const text = `${video.title} ${cue}`, tags: string[] = [];
    if (/\b(rhythm|timing|bounce|count|balance|weight|beat)\b/i.test(text)) tags.push("Rhythm");
    if (/\b(footwork|foot|step|steps|knee|heel|pivot|leg|feet)\b|weight shift/i.test(text)) tags.push("Footwork");
    if (/\b(isolation|isolations|popping|hit|arm|arms|roll|rolls|shoulder|shoulders|chest)\b/i.test(text)) tags.push("Isolations");
    return {
      id: video.publishedVideoID, title: video.title, ...ref,
      actualLiveDate: existing?.actualLiveDate ?? (ref.sourceID ? liveDates.get(ref.sourceID) ?? explicitLiveDate(video.description, snapshot.checkedAt) : null),
      publishedVideoID: video.publishedVideoID, publishedVideoURL: video.publishedVideoURL,
      publishedAt: video.publishedAt, duration: video.duration, tags: existing?.tags ?? tags,
      thumbnail: video.thumbnail, practiceCue: cue, nextStep: existing?.nextStep ?? (tags.includes("Rhythm") ? "beat" : "coach"),
      status: "public", verifiedAt: snapshot.checkedAt, metadataOrigin: existing?.metadataOrigin ?? "playlist-published-description",
    };
  }), Date.parse(snapshot.checkedAt));
}
