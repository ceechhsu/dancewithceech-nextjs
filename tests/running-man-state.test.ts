import assert from "node:assert/strict";
import test from "node:test";

import { COHORT } from "../src/lib/running-man/config";
import {
  CURRENT_TERMS_VERSION,
  REQUIRED_COMMITMENTS,
} from "../src/lib/running-man/terms";

test("running man cohort configuration has every approved immutable value", () => {
  assert.equal(COHORT.slug, "running-man-method-fall-2026");
  assert.equal(COHORT.seats, 12);
  assert.deepEqual(COHORT.tiers, [
    {
      index: 1,
      ceiling: 3,
      priceCents: 19700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_197",
    },
    {
      index: 2,
      ceiling: 6,
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
  assert.equal(COHORT.checkoutCutoffIso, "2026-09-18T06:59:00.000Z");
  assert.equal(CURRENT_TERMS_VERSION, "running-man-2026-08-22");
});

test("running man terms require the five approved commitments", () => {
  assert.deepEqual(REQUIRED_COMMITMENTS, [
    {
      id: "active-practice-video-submissions",
      label: "I commit to active practice and submitting practice videos.",
    },
    {
      id: "gradual-sharing-mastery-checkpoints",
      label: "I understand sharing is gradual and private Mastery Checkpoints are part of the process.",
    },
    {
      id: "live-participation-graduation",
      label: "I commit to live participation and the graduation requirements.",
    },
    {
      id: "adult-physical-readiness",
      label: "I confirm I am an adult and physically ready to participate.",
    },
    {
      id: "refund-cancel-postponement",
      label: "I have read and accept the refund, cancellation, and postponement terms.",
    },
  ]);
});

test("required running man commitments are immutable", () => {
  assert.equal(Object.isFrozen(REQUIRED_COMMITMENTS), true);
  for (const commitment of REQUIRED_COMMITMENTS) {
    assert.equal(Object.isFrozen(commitment), true);
  }

  assert.throws(() => {
    (REQUIRED_COMMITMENTS as unknown as Array<unknown>).push({});
  }, TypeError);
  assert.throws(() => {
    (REQUIRED_COMMITMENTS[0] as { label: string }).label = "changed";
  }, TypeError);
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
