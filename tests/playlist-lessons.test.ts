import test from "node:test";
import assert from "node:assert/strict";
import { playlistLessons } from "../src/lib/approved-pages/playlist-lessons";
import { sourceURL, searchLessons } from "../src/lib/approved-pages/dance-lessons";
import { TEACHING_PLAYLIST_ID } from "../src/lib/approved-pages/teaching-playlist-config";
import type { PlaylistSnapshot, PlaylistVideo } from "../src/lib/approved-pages/teaching-playlist";
const now = "2026-10-18T12:00:00Z";
const video = (id: string, description = "Practice a gentle weight shift."): PlaylistVideo => ({ publishedVideoID: id, publishedVideoURL: `https://www.youtube.com/shorts/${id}`, title: "Weight shift practice", description, duration: 24, publishedAt: "2026-10-17T16:00:00Z", thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embeddable: true });
function snapshot(videos: PlaylistVideo[]): PlaylistSnapshot { return { playlistID: TEACHING_PLAYLIST_ID, title: "Teaching playlist", checkedAt: now, videos }; }
test("membership never expands to include old inventory; known members retain verified cues and sources", () => {
  const lessons = playlistLessons(snapshot([video("qnGkxOT0-BQ")]));
  assert.equal(lessons.length, 1); assert.equal(lessons[0].sourceID, "1Kt8trCiZjY"); assert.equal(lessons[0].timestamp, 151); assert.equal(lessons[0].actualLiveDate, "2025-11-01");
  assert.deepEqual(playlistLessons(snapshot([])), []);
});
test("all new members are discoverable even without verified source metadata", () => {
  const lessons = playlistLessons(snapshot([video("fixture0001"), video("fixture0002")]));
  assert.equal(lessons.length, 2); assert.equal(lessons[0].sourceID, null); assert.equal(lessons[0].timestamp, null); assert.equal(lessons[0].actualLiveDate, null); assert.equal(sourceURL(lessons[0]), null);
  assert.equal(searchLessons(lessons, "weight", "Rhythm").length, 2);
});
test("source links require explicit timestamps; actual Live dates are never inferred from publication", () => {
  const a = playlistLessons(snapshot([video("fixture0001", "Try a slow knee roll.\nFull lesson: https://www.youtube.com/watch?v=8Lou4-dJ5MU&t=2m5s")]));
  assert.equal(a[0].timestamp, 125); assert.equal(a[0].sourceID, "8Lou4-dJ5MU"); assert.equal(a[0].actualLiveDate, "2025-10-07");
  const b = playlistLessons(snapshot([video("fixture0002", "Try a slow knee roll.\nhttps://youtu.be/unknown0001?t=12s")]));
  assert.equal(b[0].timestamp, 12); assert.equal(b[0].actualLiveDate, null);
  const c = playlistLessons(snapshot([video("fixture0003", "https://youtu.be/unknown0001")]));
  assert.equal(c[0].sourceID, null); assert.ok(c[0].practiceCue.startsWith("Watch the tip"));
});
test("deduplicates a repeated verified source moment but does not collapse unknown sources", () => {
  const videos = [video("fixture0001", "Practice this. https://youtu.be/8Lou4-dJ5MU?t=12"), video("fixture0002", "Practice this. https://youtu.be/8Lou4-dJ5MU?t=12"), video("fixture0003")];
  assert.equal(playlistLessons(snapshot(videos)).length, 2);
});
test("new shoulder/chest members receive body-control tags and only explicit valid Live dates", () => {
  const a = video("fixture0001", "Keep your hands still and move just your shoulders.\nhttps://www.youtube.com/watch?v=unknown0001&t=303s\nFrom the November 6, 2025 Live.");
  a.title = "Shoulder Seesaw: Keep Your Hands Still";
  const result = playlistLessons(snapshot([a]));
  assert.equal(result[0].actualLiveDate, "2025-11-06"); assert.ok(result[0].tags.includes("Isolations"));
  a.description = "Move your chest. https://youtu.be/unknown0001?t=12\nFrom the February 30, 2025 Live.";
  assert.equal(playlistLessons(snapshot([a]))[0].actualLiveDate, null);
  a.description = "Move your chest. https://youtu.be/unknown0001?t=12\nFrom the November 6, 2028 Live.";
  assert.equal(playlistLessons(snapshot([a]))[0].actualLiveDate, null);
});

test("approved heel taps appear under Hip-Hop and House, and only once across all styles", () => {
  const lesson = video("aboOF0XsJlA", "Practice the heel-tap cross and check your balance.");
  lesson.title = "Heel-tap cross: Check your balance";
  const lessons = playlistLessons(snapshot([lesson, lesson]));
  assert.deepEqual(lessons[0].styles, ["hip-hop-dance-moves", "house-dance"]);
  for (const style of ["All", "hip-hop-dance-moves", "house-dance"] as const) {
    assert.equal(searchLessons(lessons, "heel tap", "Footwork", style).length, 1);
  }
  assert.equal(searchLessons(lessons, "", "All", "breaking-dance-moves").length, 0);
});

test("approved website aliases preserve the original YouTube destination", () => {
  const lesson = video("2GHW3oogrwM", "Slide back, switch the weight, then check your balance.");
  lesson.title = "Backslide Weight Shift: Which Foot Has the Pressure?";
  const lessons = playlistLessons(snapshot([lesson]));
  assert.equal(lessons[0].title, "Backslide (Moonwalk): Which Foot Holds Your Weight?");
  assert.equal(lessons[0].publishedVideoURL, lesson.publishedVideoURL);
  assert.equal(searchLessons(lessons, "moonwalk", "All", "funk-style-dance-moves").length, 1);
});

test("new isolation lessons also count as Funk while general practice stays in All styles", () => {
  const isolation = { ...video("fixture0001", "Try these shoulder isolation drills slowly."), title: "Popping: Shoulder Isolation" };
  const armPattern = { ...video("fixture0002", "Practice the arms after the footwork."), title: "Toprock: Add the Arms" };
  const general = { ...video("fixture0003"), title: "Find the beat" };
  const lessons = playlistLessons(snapshot([isolation, armPattern, general]));
  assert.deepEqual(lessons.map(r => r.styles), [["popping", "funk-style-dance-moves"], ["breaking-dance-moves"], []]);
  assert.deepEqual(searchLessons(lessons, "", "All", "funk-style-dance-moves").map(r => r.id), [isolation.publishedVideoID]);
  assert.equal(searchLessons(lessons, "", "All", "All").length, 3);
});
