/** Read-only adapter. No channel scanning, writes, credentials storage or cache mutation. */
export const TEACHING_CHANNEL_ID = "UCj1NxAUMAfRaSv4A3ia7wCQ";
export const PLAYLIST_REVALIDATE_SECONDS = 15 * 60;
const videoID = /^[A-Za-z0-9_-]{11}$/;
const playlistID = /^[A-Za-z0-9_-]{10,100}$/;
type Thumbnail = { url?: string; width?: number; height?: number };
type Video = {
  id?: string;
  snippet?: { title?: string; description?: string; channelId?: string; publishedAt?: string; liveBroadcastContent?: string; thumbnails?: Record<string, Thumbnail> };
  contentDetails?: { duration?: string };
  status?: { privacyStatus?: string; uploadStatus?: string; embeddable?: boolean };
  liveStreamingDetails?: { scheduledStartTime?: string; actualStartTime?: string };
};
export type PlaylistVideo = {
  publishedVideoID: string; publishedVideoURL: string; title: string; description: string;
  publishedAt: string; duration: number; thumbnail: string; embeddable: boolean;
};
export type PlaylistSnapshot = { playlistID: string; title: string; checkedAt: string; videos: PlaylistVideo[] };
export type PlaylistRequest = (resource: "playlists" | "playlistItems" | "videos", parameters: Record<string, string>) => Promise<unknown>;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid YouTube response");
  return value as Record<string, unknown>;
}
function items(response: unknown): unknown[] {
  const data = object(response);
  if (data.error || !Array.isArray(data.items)) throw new Error("YouTube playlist refresh failed");
  return data.items;
}
export function durationSeconds(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  return match && match.slice(1).some(Boolean) ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : NaN;
}
function publicVideo(raw: unknown, channel: string, now: number): PlaylistVideo | null {
  const video = object(raw) as Video, snippet = video.snippet, status = video.status;
  if (!videoID.test(video.id ?? "") || snippet?.channelId !== channel || status?.privacyStatus !== "public" || status.uploadStatus !== "processed") return null;
  if (snippet.liveBroadcastContent !== "none" || video.liveStreamingDetails?.scheduledStartTime || video.liveStreamingDetails?.actualStartTime) return null;
  const published = Date.parse(snippet.publishedAt ?? ""), duration = durationSeconds(video.contentDetails?.duration ?? "");
  if (!Number.isFinite(published) || published > now || !(duration > 0) || !snippet.title?.trim()) return null;
  // The curated playlist defines the lesson selection. Duration alone cannot prove a video is a Short.
  return {
    publishedVideoID: video.id!, publishedVideoURL: `https://www.youtube.com/shorts/${video.id}`,
    title: snippet.title.trim(), description: snippet.description ?? "", publishedAt: new Date(published).toISOString(),
    duration: Math.ceil(duration), thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`, embeddable: status.embeddable === true,
  };
}

/** Only a complete successful refresh may replace the cached snapshot. Empty is a valid result. */
export async function readTeachingPlaylist({ id, request, channel = TEACHING_CHANNEL_ID, now = Date.now() }: {
  id: string; request: PlaylistRequest; channel?: string; now?: number;
}): Promise<PlaylistSnapshot> {
  if (!playlistID.test(id)) throw new Error("A valid teaching playlist ID is required");
  const playlist = items(await request("playlists", { part: "snippet,status", id }));
  if (playlist.length !== 1) throw new Error("Teaching playlist is not available");
  const details = object(playlist[0]);
  const snippet = object(details.snippet), status = object(details.status);
  if (details.id !== id || snippet.channelId !== channel || status.privacyStatus !== "public" || typeof snippet.title !== "string") throw new Error("Teaching playlist is not a public playlist owned by the expected channel");
  const members = new Set<string>(), tokens = new Set<string>();
  let token = "";
  do {
    if (tokens.has(token) || tokens.size >= 100) throw new Error("Incomplete playlist pagination");
    tokens.add(token);
    const response = await request("playlistItems", { part: "contentDetails", playlistId: id, maxResults: "50", ...(token ? { pageToken: token } : {}) });
    for (const raw of items(response)) {
      const entry = object(raw), content = object(entry.contentDetails);
      if (typeof content.videoId === "string" && videoID.test(content.videoId)) members.add(content.videoId);
    }
    const next = object(response).nextPageToken;
    if (next !== undefined && (typeof next !== "string" || !next)) throw new Error("Invalid playlist pagination");
    token = typeof next === "string" ? next : "";
  } while (token);
  const ids = [...members], verified = new Map<string, PlaylistVideo>();
  for (let index = 0; index < ids.length; index += 50) {
    const batch = new Set(ids.slice(index, index + 50));
    const response = await request("videos", { part: "snippet,contentDetails,status,liveStreamingDetails", id: [...batch].join(","), maxResults: "50" });
    for (const raw of items(response)) {
      const video = publicVideo(raw, channel, now);
      if (video && batch.has(video.publishedVideoID)) verified.set(video.publishedVideoID, video);
    }
  }
  return { playlistID: id, title: snippet.title, checkedAt: new Date(now).toISOString(), videos: [...verified.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.publishedVideoID.localeCompare(b.publishedVideoID)) };
}

// Fixed diagnostic codes only: provider messages/metadata can contain credentials or caller details.
const safeProviderReasons = new Set(["API_KEY_IP_ADDRESS_BLOCKED", "API_KEY_HTTP_REFERRER_BLOCKED", "API_KEY_SERVICE_BLOCKED", "API_KEY_INVALID", "SERVICE_DISABLED", "RATE_LIMIT_EXCEEDED", "ipRefererBlocked", "accessNotConfigured", "keyInvalid", "quotaExceeded", "dailyLimitExceeded", "forbidden"]);
export class YouTubeReadError extends Error {
  constructor(public readonly status: number, public readonly reason: string | null) {
    super(`YouTube read request failed (${status}${reason ? `: ${reason}` : ""})`);
  }
}

/** API key is supplied by an approved server-only integration; this does not create or persist one. */
export function youtubeDataRequest(apiKey: string, fetcher: typeof fetch = fetch): PlaylistRequest {
  if (!apiKey) throw new Error("YouTube read access is not configured");
  return async (resource, parameters) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    url.searchParams.set("key", apiKey);
    let response: Response;
    try {
      response = await fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(12000), redirect: "error" });
    } catch { throw new Error("YouTube read request failed"); }
    if (!response.ok) {
      let reason: string | null = null;
      try {
        const body = await response.json();
        const candidates: unknown[] = [...(Array.isArray(body.error?.details) ? body.error.details : []), ...(Array.isArray(body.error?.errors) ? body.error.errors : [])];
        for (const item of candidates) {
          const code = item && typeof item === "object" && "reason" in item ? item.reason : null;
          if (typeof code === "string" && safeProviderReasons.has(code)) { reason = code; break; }
        }
      } catch { /* Error bodies are optional and must never be echoed. */ }
      throw new YouTubeReadError(response.status, reason);
    }
    // Never expose provider error bodies, request URLs or credentials in application errors.
    try { return await response.json(); } catch { throw new Error("Invalid YouTube JSON response"); }
  };
}
