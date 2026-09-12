import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import details from "../src/lib/private-lesson-details.ts";

const { businessSchema } = details;

test("business schema includes a real business photo", () => {
  assert.equal(businessSchema.image, "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg");
  assert.ok(existsSync(new URL(`../public${new URL(businessSchema.image).pathname}`, import.meta.url)));
});

test("business price range distinguishes virtual cycles from in-person lessons", () => {
  assert.equal(businessSchema.priceRange, "$80 per virtual coaching cycle; $250 per in-person lesson");
  assert.ok(businessSchema.priceRange.length < 100);
});
