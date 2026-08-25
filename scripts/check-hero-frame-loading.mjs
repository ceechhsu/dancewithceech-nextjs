import fs from "node:fs";

const hero = fs.readFileSync(new URL("../src/components/ScrollyHero.tsx", import.meta.url), "utf8");

if (!hero.includes("INITIAL_FRAME_COUNT")) {
  throw new Error("The hero needs an explicit small initial frame budget.");
}

if (!hero.includes("requestedFramesRef")) {
  throw new Error("The hero needs to track which frames have already been requested.");
}

if (!hero.includes("loadFrame(0)")) {
  throw new Error("The hero must load its first frame immediately.");
}

if (hero.includes("for (let i = 1; i <= TOTAL_FRAMES; i++)")) {
  throw new Error("The hero must not request all animation frames during startup.");
}

console.log("Hero frames load progressively instead of all at startup.");
