import test from "node:test";
import assert from "node:assert/strict";
import { readTeachingPlaylist, youtubeDataRequest, durationSeconds, TEACHING_CHANNEL_ID, type PlaylistRequest } from "../src/lib/approved-pages/teaching-playlist";
const id = "PLteaching_fixture_01", now = Date.parse("2026-10-18T12:00:00Z");
const video = (n: number, change = {}) => ({ id: `fixture${String(n).padStart(4, "0")}`, snippet: { channelId: TEACHING_CHANNEL_ID, title: `Teaching tip ${n}`, description: "Published instruction", publishedAt: "2026-10-17T16:00:00Z", liveBroadcastContent: "none" }, contentDetails: { duration: "PT24S" }, status: { privacyStatus: "public", uploadStatus: "processed", embeddable: true }, ...change });
function fixture({ videos = [video(1)], pages = [[video(1).id]], owner = TEACHING_CHANNEL_ID, privacy = "public" } = {}) {
  const calls: { resource: string; parameters: Record<string, string> }[] = [];
  const request: PlaylistRequest = async (resource, parameters) => {
    calls.push({ resource, parameters });
    if (resource === "playlists") return { items: [{ id, snippet: { title: "Quick Hip-Hop Tips from My Live Classes", channelId: owner }, status: { privacyStatus: privacy } }] };
    if (resource === "playlistItems") {
      const page = Number(parameters.pageToken || 0);
      return { items: pages[page].map(videoId => ({ contentDetails: { videoId } })), ...(page + 1 < pages.length ? { nextPageToken: String(page + 1) } : {}) };
    }
    return { items: videos.filter(v => parameters.id.split(",").includes(v.id)) };
  };
  return { request, calls };
}
test("paginates all membership, batches at 50, deduplicates and never scans the channel", async () => {
  const videos = Array.from({ length: 72 }, (_, i) => video(i));
  const f = fixture({ videos, pages: [videos.slice(0, 50).map(v => v.id), [videos[0].id, ...videos.slice(50).map(v => v.id)]] });
  const s = await readTeachingPlaylist({ id, request: f.request, now });
  assert.equal(s.videos.length, 72); assert.equal(s.playlistID, id);
  assert.deepEqual(f.calls.map(c => c.resource), ["playlists", "playlistItems", "playlistItems", "videos", "videos"]);
  assert.equal(f.calls[3].parameters.id.split(",").length, 50);
  assert.equal(s.videos[0].thumbnail, `https://i.ytimg.com/vi/${s.videos[0].publishedVideoID}/hqdefault.jpg`);
});
test("only current membership is returned; old or injected unrelated IDs never enter", async () => {
  const f = fixture({ videos: [video(1), video(2)], pages: [[video(1).id]] });
  assert.deepEqual((await readTeachingPlaylist({ id, request: f.request, now })).videos.map(v => v.publishedVideoID), [video(1).id]);
  const request: PlaylistRequest = async (r, p) => r === "videos" ? { items: [video(1), video(2)] } : f.request(r, p);
  assert.equal((await readTeachingPlaylist({ id, request, now })).videos.length, 1);
});
test("excludes unlisted/private/unprocessed/future/upcoming/live/foreign/deleted members", async () => {
  const publicSnippet = video(1).snippet, publicStatus = video(1).status;
  const videos = [video(1), video(2, { status: { ...publicStatus, privacyStatus: "unlisted" } }), video(3, { status: { ...publicStatus, privacyStatus: "private" } }), video(4, { snippet: { ...publicSnippet, publishedAt: "2026-10-19T00:00:00Z" } }), video(5, { snippet: { ...publicSnippet, liveBroadcastContent: "upcoming" } }), video(6, { liveStreamingDetails: { scheduledStartTime: "2026-10-19T00:00:00Z" } }), video(7, { snippet: { ...publicSnippet, channelId: "other-channel" } }), video(8, { status: { ...publicStatus, uploadStatus: "uploaded" } }), video(9, { snippet: { ...publicSnippet, liveBroadcastContent: "live" } })];
  const f = fixture({ videos, pages: [[...videos.map(v => v.id), video(99).id]] });
  assert.deepEqual((await readTeachingPlaylist({ id, request: f.request, now })).videos.map(v => v.publishedVideoID), [video(1).id]);
});
test("sorts actual publication time, not playlist insertion order; blocked embeds remain discoverable", async () => {
  const videos = [video(1), video(2, { snippet: { ...video(1).snippet, publishedAt: "2026-10-18T11:00:00Z" }, status: { ...video(1).status, embeddable: false } })];
  const f = fixture({ videos, pages: [[video(1).id, video(2).id]] });
  const s = await readTeachingPlaylist({ id, request: f.request, now });
  assert.equal(s.videos[0].publishedVideoID, video(2).id); assert.equal(s.videos[0].embeddable, false);
});
test("valid empty playlist replaces membership with an empty snapshot", async () => {
  const f = fixture({ pages: [[]], videos: [] });
  assert.deepEqual((await readTeachingPlaylist({ id, request: f.request, now })).videos, []);
  assert.equal(f.calls.filter(c => c.resource === "videos").length, 0);
});
test("rejects invalid ID and private/foreign playlist before reading members", async () => {
  for (const f of [fixture({ owner: "other-channel" }), fixture({ privacy: "private" })]) {
    await assert.rejects(readTeachingPlaylist({ id, request: f.request, now })); assert.equal(f.calls.length, 1);
  }
  const f = fixture(); await assert.rejects(readTeachingPlaylist({ id: "../../bad", request: f.request, now })); assert.equal(f.calls.length, 0);
});
test("failed second page or details batch throws instead of returning a partial success", async () => {
  const f = fixture({ pages: [[video(1).id], [video(2).id]] });
  const request: PlaylistRequest = async (r, p) => { if (p.pageToken === "1") throw new Error("quota failure"); return f.request(r, p); };
  await assert.rejects(readTeachingPlaylist({ id, request, now }), /quota failure/);
  const f2 = fixture(); await assert.rejects(readTeachingPlaylist({ id, now, request: async (r, p) => r === "videos" ? { error: { message: "provider failure" } } : f2.request(r, p) }));
});
test("repeated pagination token and malformed upstream response fail atomically", async () => {
  const f = fixture();
  await assert.rejects(readTeachingPlaylist({ id, now, request: async (r, p) => r === "playlistItems" ? { items: [], nextPageToken: "repeat" } : f.request(r, p) }), /pagination/);
  await assert.rejects(readTeachingPlaylist({ id, now, request: async () => ({ items: null }) }), /refresh failed/);
});
test("malformed dates and zero/missing durations never become public lesson cards", async () => {
  const videos = [video(1, { contentDetails: { duration: "PT0S" } }), video(2, { snippet: { ...video(1).snippet, publishedAt: "invalid" } })];
  const f = fixture({ videos, pages: [videos.map(v => v.id)] }); assert.equal((await readTeachingPlaylist({ id, now, request: f.request })).videos.length, 0);
  assert.equal(durationSeconds("PT1M24S"), 84); assert.ok(Number.isNaN(durationSeconds("P1D")));
});
test("read adapter uses bounded no-store GET and does not leak credentials/provider bodies on errors", async () => {
  const secret = "fixture-secret-do-not-log";
  let count = 0;
  const request = youtubeDataRequest(secret, (async (input, init) => {
    count++; assert.equal(new URL(String(input)).origin, "https://www.googleapis.com"); assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error"); assert.ok(init?.signal); assert.ok(!init?.method || init.method === "GET");
    throw new Error(`network ${secret}`);
  }) as typeof fetch);
  await assert.rejects(request("playlistItems", { playlistId: id }), error => !String(error).includes(secret)); assert.equal(count, 1);
  const failed = youtubeDataRequest(secret, (async () => new Response(secret, { status: 403 })) as typeof fetch);
  await assert.rejects(failed("videos", { id: video(1).id }), error => /403/.test(String(error)) && !String(error).includes(secret));
  assert.throws(() => youtubeDataRequest(""), /not configured/);
});
test("provider diagnostics expose only whitelisted codes, never key/caller messages", async () => {
  const secret = "fixture-secret-do-not-log";
  const request = youtubeDataRequest(secret, (async () => Response.json({ error: { message: `blocked ${secret}`, details: [{ reason: "API_KEY_IP_ADDRESS_BLOCKED", metadata: { callerIp: "192.0.2.2", key: secret } }] } }, { status: 403 })) as typeof fetch);
  await assert.rejects(request("playlists", { id }), error => /API_KEY_IP_ADDRESS_BLOCKED/.test(String(error)) && !String(error).includes(secret) && !String(error).includes("192.0.2.2"));
  const unknown = youtubeDataRequest(secret, (async () => Response.json({ error: { details: [{ reason: secret }] } }, { status: 403 })) as typeof fetch);
  await assert.rejects(unknown("playlists", { id }), error => !String(error).includes(secret));
});
