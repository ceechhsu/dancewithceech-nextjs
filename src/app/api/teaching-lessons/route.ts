import "server-only";
import { unstable_cache } from "next/cache";
import { readTeachingPlaylist, youtubeDataRequest, PLAYLIST_REVALIDATE_SECONDS } from "@/lib/approved-pages/teaching-playlist";
import { TEACHING_PLAYLIST_ID, MAX_PLAYLIST_STALE_MS } from "@/lib/approved-pages/teaching-playlist-config";
import { playlistLessons } from "@/lib/approved-pages/playlist-lessons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const readCached = unstable_cache(async () => {
  // Read-only, server-only integration seam. No credential is provisioned by this candidate.
  const key = process.env.YOUTUBE_TEACHING_API_KEY;
  if (!key) throw new Error("Teaching playlist read access is not configured");
  const snapshot = await readTeachingPlaylist({ id: TEACHING_PLAYLIST_ID, request: youtubeDataRequest(key) });
  return { playlistID: snapshot.playlistID, checkedAt: snapshot.checkedAt, lessons: playlistLessons(snapshot) };
}, ["teaching-playlist", TEACHING_PLAYLIST_ID, "lesson-schema-v1"], { revalidate: PLAYLIST_REVALIDATE_SECONDS });

export async function GET() {
  // Unconfigured/cold-error responses are deliberately not stored as successful empty snapshots.
  if (!process.env.YOUTUBE_TEACHING_API_KEY) return Response.json({ error: "Lessons are temporarily unavailable." }, { status: 503, headers: { ...headers, "Retry-After": "60" } });
  try {
    const snapshot = await readCached();
    if (Date.now() - Date.parse(snapshot.checkedAt) > MAX_PLAYLIST_STALE_MS) throw new Error("Playlist snapshot expired");
    return Response.json(snapshot, { headers });
  } catch {
    // Do not log request URLs, keys or provider response bodies.
    return Response.json({ error: "Lessons are temporarily unavailable." }, { status: 503, headers: { ...headers, "Retry-After": "60" } });
  }
}
