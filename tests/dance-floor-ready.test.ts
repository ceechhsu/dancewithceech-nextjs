import assert from "node:assert/strict";
import { test } from "node:test";
import { initialFunnel, advanceFunnel } from "../src/lib/program-a/dance-floor-ready";

test("a visitor can reach booking only by taking the yes branch and meeting all three commitments", () => {
  let state = initialFunnel;
  state = advanceFunnel(state, "ready");
  assert.equal(state.stage, "story");
  for (const answer of ["continue", "yes", "continue", "nervous", "ready", "nervous"] as const) {
    state = advanceFunnel(state, answer);
  }
  assert.equal(state.stage, "booking");
});

test("not quite reveals the drill and doesn't advance to paid coaching", () => {
  const fit = advanceFunnel(initialFunnel, "continue");
  const drill = advanceFunnel(fit, "no");
  assert.equal(drill.stage, "drill");
  assert.equal(advanceFunnel(drill, "continue").stage, "drill");
  assert.equal(advanceFunnel(drill, "back").stage, "fit");
});

test("not ready offers a drill, and back returns to the exact commitment", () => {
  let state = initialFunnel;
  for (const answer of ["continue", "yes", "continue", "ready", "not-now"] as const) {
    state = advanceFunnel(state, answer);
  }
  assert.deepEqual(state, { stage: "exit", question: 1 });
  assert.deepEqual(advanceFunnel(state, "back"), { stage: "questions", question: 1 });
  assert.deepEqual(advanceFunnel(advanceFunnel(state, "drill"), "back"), state);
});
