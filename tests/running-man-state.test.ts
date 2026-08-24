import assert from "node:assert/strict";
import test from "node:test";

import { COHORT } from "../src/lib/running-man/config";
import {
  CURRENT_TERMS_VERSION,
  REQUIRED_COMMITMENTS,
} from "../src/lib/running-man/terms";
import {
  EnrollmentAggregateError,
  deriveEnrollmentState,
  type EnrollmentAggregate,
} from "../src/lib/running-man/state";
import type { EnrollmentState } from "../src/lib/running-man/types";

const CHECKOUT_OPEN = new Date("2026-09-18T06:58:59.999Z");

function aggregate(
  overrides: Partial<EnrollmentAggregate> = {},
): EnrollmentAggregate {
  return {
    now: CHECKOUT_OPEN,
    activePaidStudents: 0,
    capacityConsumed: 0,
    tiers: {
      1: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
    coaching: { activePaid: 0, underReview: 0, activeHolds: 0 },
    hasOpenPreDeadlineSession: false,
    ...overrides,
  };
}

test("initial enrollment state leads with the founding benefit without a zero-claimed count", () => {
  const state = deriveEnrollmentState(aggregate());

  assert.equal(state.enrollmentStatus, "open");
  assert.equal(state.activeTier.index, 1);
  assert.equal(state.activeTier.priceCents, 19700);
  assert.equal(state.currentCta.supportingCopy, "Founding price for the first 3 students.");
  assert.doesNotMatch(state.currentCta.supportingCopy, /0 claimed/);
  assert.equal(state.canStartCheckout, true);
  assert.deepEqual(
    state.tierLadder.map((tier) => [tier.index, tier.priceCents, tier.status]),
    [[1, 19700, "active"], [2, 24700, "upcoming"], [3, 29700, "upcoming"]],
  );
});

test("first-tier paid allocations show only truthful claimed and remaining counts", () => {
  const oneClaimed = deriveEnrollmentState(aggregate({
    activePaidStudents: 1,
    capacityConsumed: 1,
    tiers: {
      1: { activePaid: 1, allocationConsumed: 1, underReview: 0, activeHolds: 0 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));
  const twoClaimed = deriveEnrollmentState(aggregate({
    activePaidStudents: 2,
    capacityConsumed: 2,
    tiers: {
      1: { activePaid: 2, allocationConsumed: 2, underReview: 0, activeHolds: 0 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(oneClaimed.currentCta.supportingCopy, "1 of 3 claimed · 2 left.");
  assert.equal(twoClaimed.currentCta.supportingCopy, "2 of 3 claimed · 1 left.");
});

test("a completed unreopened tier advances to the next price", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 3,
    capacityConsumed: 3,
    tiers: {
      1: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(state.activeTier.index, 2);
  assert.equal(state.activeTier.priceCents, 24700);
  assert.equal(state.tierLadder[0].status, "complete");
});

test("a reviewed first-tier allocation pauses checkout instead of advancing to the next price", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 2,
    capacityConsumed: 3,
    tiers: {
      1: { activePaid: 2, allocationConsumed: 3, underReview: 1, activeHolds: 0 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(state.enrollmentStatus, "capacity_under_review");
  assert.equal(state.activeTier.index, 1);
  assert.equal(state.activeTier.priceCents, 19700);
  assert.equal(state.canStartCheckout, false);
  assert.equal(state.tierLadder[0].status, "under_review");
  assert.equal(state.tierLadder[1].status, "upcoming");
  assert.match(state.currentCta.supportingCopy, /unavailable while enrollment is under review/i);
});

test("a hold on the last first-tier allocation pauses enrollment without advancing the price", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 2,
    capacityConsumed: 2,
    tiers: {
      1: { activePaid: 2, allocationConsumed: 2, underReview: 0, activeHolds: 1 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(state.enrollmentStatus, "tier_held");
  assert.equal(state.activeTier.index, 1);
  assert.equal(state.activeTier.priceCents, 19700);
  assert.equal(state.canStartCheckout, false);
  assert.equal(state.currentCta.supportingCopy, "1 checkout currently in progress. The final founding-price seat is temporarily held.");
});

test("a partial tier hold preserves paid seat availability and identifies the held seat", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 1,
    capacityConsumed: 1,
    tiers: {
      1: { activePaid: 1, allocationConsumed: 1, underReview: 0, activeHolds: 1 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(state.enrollmentStatus, "open");
  assert.equal(state.canStartCheckout, true);
  assert.equal(state.seatsRemaining, 11);
  assert.equal(state.currentCta.supportingCopy, "1 of 3 claimed · 1 temporarily held in checkout · 2 spots remaining.");
});

test("temporary checkout holds are reported separately from paid seat availability", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 1,
    capacityConsumed: 1,
    tiers: {
      1: { activePaid: 1, allocationConsumed: 1, underReview: 0, activeHolds: 1 },
      2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
    },
  }));

  assert.equal(state.seatsRemaining, 11);
  assert.equal(state.activeTier.remaining, 2);
  assert.equal(state.activeTier.held, 1);
  assert.equal(state.currentCta.supportingCopy, "1 of 3 claimed · 1 temporarily held in checkout · 2 spots remaining.");
});

test("reviewed allocations consume capacity without being presented as paid students", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 11,
    capacityConsumed: 12,
    tiers: {
      1: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      2: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      3: { activePaid: 5, allocationConsumed: 6, underReview: 1, activeHolds: 0 },
    },
  }));

  assert.equal(state.enrollmentStatus, "capacity_under_review");
  assert.equal(state.canStartCheckout, false);
  assert.equal(state.activePaidStudents, 11);
  assert.equal(state.seatsRemaining, null);
  assert.equal(state.tierLadder[2].status, "under_review");
  assert.match(state.currentCta.supportingCopy, /unavailable while enrollment is under review/i);
  assert.doesNotMatch(state.currentCta.supportingCopy, /12 claimed|sold out|waitlist/i);
});

test("coaching states distinguish sold-out, held, and under-review capacity without fabricating counts", () => {
  const soldOut = deriveEnrollmentState(aggregate({
    coaching: { activePaid: 3, underReview: 0, activeHolds: 0 },
  }));
  const held = deriveEnrollmentState(aggregate({
    coaching: { activePaid: 2, underReview: 0, activeHolds: 1 },
  }));
  const underReview = deriveEnrollmentState(aggregate({
    coaching: { activePaid: 2, underReview: 1, activeHolds: 0 },
  }));

  assert.equal(soldOut.coachingStatus, "sold_out");
  assert.equal(soldOut.coachingSeatsRemaining, 0);
  assert.equal(soldOut.coachingSeatsClaimed, 3);
  assert.equal(soldOut.coachingSeatsHeld, 0);
  assert.equal(held.coachingStatus, "held");
  assert.equal(held.coachingSeatsRemaining, null);
  assert.equal(held.coachingSeatsClaimed, 2);
  assert.equal(held.coachingSeatsHeld, 1);
  assert.equal(underReview.coachingStatus, "under_review");
  assert.equal(underReview.coachingSeatsRemaining, null);
  assert.equal(underReview.coachingSeatsClaimed, 2);
  assert.equal(underReview.coachingSeatsHeld, 0);
});

test("a partial coaching hold leaves the remaining coaching spots selectable", () => {
  const state = deriveEnrollmentState(aggregate({
    coaching: { activePaid: 0, underReview: 0, activeHolds: 1 },
  }));

  assert.equal(state.coachingStatus, "available");
  assert.equal(state.coachingSeatsRemaining, 2);
  assert.equal(state.coachingSeatsClaimed, 0);
  assert.equal(state.coachingSeatsHeld, 1);
});

test("the cutoff closes new enrollment even while a valid pre-cutoff session remains pending", () => {
  const state = deriveEnrollmentState(aggregate({
    now: new Date("2026-09-18T07:00:00.000Z"),
    hasOpenPreDeadlineSession: true,
  }));

  assert.equal(state.enrollmentStatus, "closed");
  assert.equal(state.canStartCheckout, false);
  assert.equal(state.requiresPriceReconfirmation, true);
  assert.match(state.currentCta.supportingCopy, /new enrollment is closed/i);
});

test("a cohort filled by a resolved pre-deadline session remains sold out after the cutoff", () => {
  const state = deriveEnrollmentState(aggregate({
    now: new Date("2026-09-18T07:00:00.000Z"),
    activePaidStudents: 12,
    capacityConsumed: 12,
    tiers: {
      1: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      2: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      3: { activePaid: 6, allocationConsumed: 6, underReview: 0, activeHolds: 0 },
    },
    hasOpenPreDeadlineSession: false,
  }));

  assert.equal(state.enrollmentStatus, "sold_out");
  assert.equal(state.currentCta.label, "Join the waitlist");
  assert.equal(state.canStartCheckout, false);
});

test("the shared enrollment state contract exposes the client-safe derived state", () => {
  const state: EnrollmentState = deriveEnrollmentState(aggregate());

  assert.equal(state.activeTier.priceCents, 19700);
  assert.equal(state.coachingStatus, "available");
});

test("eleven paid students and one reviewed allocation never becomes sold out or waitlist", () => {
  const state = deriveEnrollmentState(aggregate({
    activePaidStudents: 11,
    capacityConsumed: 12,
    tiers: {
      1: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      2: { activePaid: 3, allocationConsumed: 3, underReview: 0, activeHolds: 0 },
      3: { activePaid: 5, allocationConsumed: 6, underReview: 1, activeHolds: 0 },
    },
  }));

  assert.notEqual(state.enrollmentStatus, "sold_out");
  assert.doesNotMatch(state.currentCta.supportingCopy, /waitlist|sold out/i);
});

test("invalid aggregate counts fail safely instead of producing scarcity copy", () => {
  assert.throws(
    () => deriveEnrollmentState(aggregate({ activePaidStudents: -1 })),
    EnrollmentAggregateError,
  );
  assert.throws(
    () => deriveEnrollmentState(aggregate({
      activePaidStudents: 1,
      capacityConsumed: 1,
      tiers: {
        1: { activePaid: 1, allocationConsumed: 1, underReview: 0, activeHolds: 0 },
        2: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 1 },
        3: { activePaid: 0, allocationConsumed: 0, underReview: 0, activeHolds: 0 },
      },
    })),
    EnrollmentAggregateError,
  );
  const missingHoldCount = aggregate();
  delete (missingHoldCount.tiers[1] as Partial<EnrollmentAggregate["tiers"][1]>).activeHolds;
  assert.throws(
    () => deriveEnrollmentState(missingHoldCount),
    EnrollmentAggregateError,
  );
});

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
