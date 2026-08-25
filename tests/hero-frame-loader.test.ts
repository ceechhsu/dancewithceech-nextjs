import assert from "node:assert/strict";
import test from "node:test";

import {
  getFrameNeighborhood,
  getInitialFrameIndices,
} from "../src/lib/hero-frames";

test("initial hero frames start at zero and are evenly distributed", () => {
  assert.deepEqual(getInitialFrameIndices(197, 12), [
    0, 18, 36, 53, 71, 89, 107, 125, 143, 160, 178, 196,
  ]);
});

test("initial hero frames are unique and clamped for small frame sets", () => {
  assert.deepEqual(getInitialFrameIndices(3, 12), [0, 1, 2]);
  assert.deepEqual(getInitialFrameIndices(1, 12), [0]);
  assert.deepEqual(getInitialFrameIndices(0, 12), []);
});

test("frame neighborhood loads the current frame first with a bounded look-ahead", () => {
  assert.deepEqual(getFrameNeighborhood(100, 197, 2, 6), [
    100, 99, 98, 101, 102, 103, 104, 105, 106,
  ]);
});

test("frame neighborhood stays inside the sequence at both edges", () => {
  assert.deepEqual(getFrameNeighborhood(0, 197, 2, 6), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(getFrameNeighborhood(196, 197, 2, 6), [196, 195, 194]);
  assert.deepEqual(getFrameNeighborhood(0, 0, 2, 6), []);
});
