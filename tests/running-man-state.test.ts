import assert from "node:assert/strict";
import test from "node:test";

import { COHORT } from "../src/lib/running-man/config";
import { CURRENT_TERMS_VERSION } from "../src/lib/running-man/terms";

test("running man cohort configuration has every approved immutable value", () => {
  assert.equal(COHORT.slug, "running-man-method-fall-2026");
  assert.equal(COHORT.seats, 12);
  assert.deepEqual(COHORT.tiers, [
    {
      index: 1,
      ceiling: 4,
      priceCents: 19700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_197",
    },
    {
      index: 2,
      ceiling: 8,
      priceCents: 24700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_247",
    },
    {
      index: 3,
      ceiling: 12,
      priceCents: 29700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_297",
    },
  ]);
  assert.deepEqual(COHORT.coaching, {
    seats: 3,
    priceCents: 10000,
    priceEnv: "RUNNING_MAN_STRIPE_PRICE_COACHING",
  });
  assert.equal(COHORT.cutoffIso, "2026-09-18T06:59:00.000Z");
  assert.equal(CURRENT_TERMS_VERSION, "running-man-2026-08-22");
});

test("running man cohort configuration is frozen at every level", () => {
  assert.equal(Object.isFrozen(COHORT), true);
  assert.equal(Object.isFrozen(COHORT.tiers), true);
  assert.equal(Object.isFrozen(COHORT.coaching), true);
  for (const tier of COHORT.tiers) {
    assert.equal(Object.isFrozen(tier), true);
  }

  assert.throws(() => {
    (COHORT as { seats: number }).seats = 0;
  }, TypeError);
  assert.throws(() => {
    (COHORT.tiers[0] as { priceCents: number }).priceCents = 0;
  }, TypeError);
  assert.throws(() => {
    (COHORT.coaching as { seats: number }).seats = 0;
  }, TypeError);
});
