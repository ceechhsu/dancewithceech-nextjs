import assert from "node:assert/strict";
import { test } from "node:test";
import { firstIneligibleAnswer, validateSampleApplication } from "../src/lib/program-a/application";
import { isProgramAPreview } from "../src/lib/program-a/offer";

const example = { answers: ["B", "B", "A", "B"], firstName: " Jordan ", email: "jordan@example.com" };

test("both A and B qualify, and C can end the application at any question", () => {
  assert.equal(firstIneligibleAnswer(["B", "A", "B", "A"]), -1);
  for (let position = 0; position < 4; position += 1) {
    const answers = ["A", "B", "A", "B"] as const;
    const withExit = [...answers];
    assert.equal(firstIneligibleAnswer(withExit.map((answer, index) => index === position ? "C" : answer)), position);
  }
});

test("sample submission requires complete, qualifying answers and valid contact fields", () => {
  assert.equal(validateSampleApplication(example), true);
  assert.equal(validateSampleApplication({ ...example, answers: ["A"] }), false);
  assert.equal(validateSampleApplication({ ...example, answers: ["A", "B", "C", "A"] }), false);
  assert.equal(validateSampleApplication({ ...example, answers: ["A", 1, "B", "A"] }), false);
  assert.equal(validateSampleApplication({ ...example, firstName: " " }), false);
  assert.equal(validateSampleApplication({ ...example, email: "jordan" }), false);
});

test("the preview is opt-in and excluded from production", () => {
  assert.equal(isProgramAPreview({ PROGRAM_A_PREVIEW: "1", VERCEL_ENV: "preview" }), true);
  assert.equal(isProgramAPreview({ PROGRAM_A_PREVIEW: "1", VERCEL_ENV: "production" }), false);
  assert.equal(isProgramAPreview({ VERCEL_ENV: "preview" }), false);
  assert.equal(isProgramAPreview({ PROGRAM_A_PREVIEW: "1", NODE_ENV: "development" }), true);
});
