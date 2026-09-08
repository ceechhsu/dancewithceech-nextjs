import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("BeatFirst explicitly resumes the Web Audio context before scheduling beats", () => {
  const source = fs.readFileSync(path.join(root, "src/hooks/useBeatFirstAudio.ts"), "utf8");
  assert.match(source, /await Tone\.getContext\(\)\.resume\(\)/);
  assert.match(source, /const resumePromise = rawContext\.state === 'suspended' \? rawContext\.resume\(\)/);
  assert.match(source, /Tone\.getDestination\(\)\.mute = false/);
  assert.match(source, /analyserRef\.current\.toDestination\(\)/);
  assert.match(source, /if \(kickRef\.current\) return/);
  assert.match(source, /kickRef\.current = null/);
  assert.match(source, /bassAnalyserRef\.current = null/);
});
