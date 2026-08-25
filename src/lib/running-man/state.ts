import { COHORT } from "./config";
import type {
  CoachingStatus,
  EnrollmentState,
  EnrollmentStatus,
  EnrollmentTier,
  TierIndex,
  TierLadderStatus,
} from "./types";

export type {
  CoachingStatus,
  EnrollmentState,
  EnrollmentStatus,
  EnrollmentTier,
  TierIndex,
  TierLadderStatus,
} from "./types";

export type EnrollmentAggregate = {
  now: Date;
  activePaidStudents: number;
  capacityConsumed: number;
  tiers: Record<
    TierIndex,
    {
      activePaid: number;
      allocationConsumed: number;
      underReview: number;
      activeHolds: number;
    }
  >;
  coaching: {
    activePaid: number;
    underReview: number;
    activeHolds: number;
  };
  hasOpenPreDeadlineSession: boolean;
};

export class EnrollmentAggregateError extends Error {
  override name = "EnrollmentAggregateError";
}

const tierIndexes: readonly TierIndex[] = [1, 2, 3];
const checkoutCutoff = new Date(COHORT.checkoutCutoffIso);

function invalid(message: string): never {
  throw new EnrollmentAggregateError(message);
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${label} must be a non-negative safe integer.`);
  }
}

function tierCapacity(index: TierIndex): number {
  const tier = COHORT.tiers[index - 1];
  const previousCeiling = index === 1 ? 0 : COHORT.tiers[index - 2].ceiling;
  return tier.ceiling - previousCeiling;
}

function assertValidAggregate(aggregate: EnrollmentAggregate): void {
  if (!(aggregate.now instanceof Date) || Number.isNaN(aggregate.now.getTime())) {
    invalid("now must be a valid Date.");
  }
  if (typeof aggregate.hasOpenPreDeadlineSession !== "boolean") {
    invalid("hasOpenPreDeadlineSession must be boolean.");
  }

  assertNonNegativeInteger(aggregate.activePaidStudents, "activePaidStudents");
  assertNonNegativeInteger(aggregate.capacityConsumed, "capacityConsumed");

  let paidAcrossTiers = 0;
  let consumedAcrossTiers = 0;
  let priorTierComplete = true;

  for (const index of tierIndexes) {
    const tier = aggregate.tiers?.[index];
    if (!tier) invalid(`tiers.${index} is required.`);

    for (const field of ["activePaid", "allocationConsumed", "underReview", "activeHolds"] as const) {
      assertNonNegativeInteger(tier[field], `tiers.${index}.${field}`);
    }

    const capacity = tierCapacity(index);
    if (tier.allocationConsumed > capacity) {
      invalid(`tiers.${index}.allocationConsumed exceeds its tier capacity.`);
    }
    if (tier.activePaid + tier.underReview !== tier.allocationConsumed) {
      invalid(`tiers.${index} allocations must equal active paid plus under-review allocations.`);
    }
    if (tier.activeHolds > capacity - tier.allocationConsumed) {
      invalid(`tiers.${index}.activeHolds exceeds unallocated capacity.`);
    }
    if (!priorTierComplete && (tier.allocationConsumed > 0 || tier.activeHolds > 0)) {
      invalid("Later-tier allocations and holds require every prior tier to be fully allocated.");
    }

    paidAcrossTiers += tier.activePaid;
    consumedAcrossTiers += tier.allocationConsumed;
    priorTierComplete = tier.allocationConsumed === capacity;
  }

  if (paidAcrossTiers !== aggregate.activePaidStudents) {
    invalid("activePaidStudents must equal the total active paid tier allocations.");
  }
  if (consumedAcrossTiers !== aggregate.capacityConsumed) {
    invalid("capacityConsumed must equal the total tier allocations consumed.");
  }
  if (aggregate.capacityConsumed > COHORT.seats) {
    invalid("capacityConsumed exceeds cohort capacity.");
  }

  const coaching = aggregate.coaching;
  if (!coaching) invalid("coaching is required.");
  for (const field of ["activePaid", "underReview", "activeHolds"] as const) {
    assertNonNegativeInteger(coaching[field], `coaching.${field}`);
  }
  if (coaching.activePaid + coaching.underReview + coaching.activeHolds > COHORT.coaching.seats) {
    invalid("Coaching allocations exceed coaching capacity.");
  }
}

function activeTierIndex(aggregate: EnrollmentAggregate): TierIndex {
  for (const index of tierIndexes) {
    if (aggregate.tiers[index].underReview > 0) return index;
    if (aggregate.tiers[index].allocationConsumed < tierCapacity(index)) return index;
  }
  return 3;
}

function coachingStatusFor(coaching: EnrollmentAggregate["coaching"]): CoachingStatus {
  if (coaching.activePaid === COHORT.coaching.seats) return "sold_out";
  if (coaching.underReview > 0) return "under_review";
  if (coaching.activePaid + coaching.activeHolds >= COHORT.coaching.seats) return "held";
  return "available";
}

function currentStatus(aggregate: EnrollmentAggregate, tierIndex: TierIndex): EnrollmentStatus {
  if (aggregate.activePaidStudents === COHORT.seats) return "sold_out";
  if (aggregate.now >= checkoutCutoff) return "closed";
  if (tierIndexes.some((index) => aggregate.tiers[index].underReview > 0)) {
    return "capacity_under_review";
  }
  if (aggregate.capacityConsumed === COHORT.seats) return "capacity_under_review";

  const tier = aggregate.tiers[tierIndex];
  const remainingAtTier = tierCapacity(tierIndex) - tier.allocationConsumed;
  return tier.activeHolds === remainingAtTier ? "tier_held" : "open";
}

function ladderFor(
  aggregate: EnrollmentAggregate,
  activeIndex: TierIndex,
  status: EnrollmentStatus,
): readonly EnrollmentTier[] {
  return COHORT.tiers.map((tier) => {
    const previousCeiling = tier.index === 1 ? 0 : COHORT.tiers[tier.index - 2].ceiling;
    const capacity = tier.ceiling - previousCeiling;
    const aggregateTier = aggregate.tiers[tier.index];
    let tierStatus: TierLadderStatus;
    if (aggregateTier.underReview > 0) {
      tierStatus = "under_review";
    } else if (aggregateTier.allocationConsumed === tierCapacity(tier.index)) {
      tierStatus = "complete";
    } else if (tier.index > activeIndex) {
      tierStatus = "upcoming";
    } else if (status === "tier_held") {
      tierStatus = "held";
    } else if (status === "capacity_under_review") {
      tierStatus = "under_review";
    } else if (status === "closed" || status === "sold_out") {
      tierStatus = "unavailable";
    } else {
      tierStatus = "active";
    }

    return {
      index: tier.index,
      ceiling: tier.ceiling,
      priceCents: tier.priceCents,
      status: tierStatus,
      capacity,
      claimed: aggregateTier.activePaid,
      remaining: capacity - aggregateTier.allocationConsumed,
      held: aggregateTier.activeHolds,
    };
  });
}

function ctaFor(
  status: EnrollmentStatus,
  tier: EnrollmentTier,
  aggregate: EnrollmentAggregate,
): EnrollmentState["currentCta"] {
  if (status === "closed") {
    return {
      label: "Enrollment closed",
      supportingCopy: "New enrollment is closed. Any checkout already opened before the deadline may still resolve.",
    };
  }
  if (status === "sold_out") {
    return { label: "Join the waitlist", supportingCopy: "All 12 cohort seats are claimed." };
  }
  if (status === "capacity_under_review") {
    return {
      label: "Enrollment under review",
      supportingCopy: "Enrollment is temporarily unavailable while enrollment is under review.",
    };
  }
  if (status === "tier_held") {
    const held = aggregate.tiers[tier.index].activeHolds;
    return {
      label: "Enrollment temporarily paused",
      supportingCopy: `${held} checkout${held === 1 ? "" : "s"} currently in progress. The final ${tier.index === 1 ? "founding-price" : `tier-${tier.index}`} seat is temporarily held.`,
    };
  }

  const tierAggregate = aggregate.tiers[tier.index];
  const capacity = tierCapacity(tier.index);
  if (tierAggregate.underReview > 0) {
    return {
      label: `Claim your seat — $${tier.priceCents / 100}`,
      supportingCopy: `${tierAggregate.activePaid} of ${capacity} claimed · availability is under review.`,
    };
  }
  if (tierAggregate.activeHolds > 0) {
    const remaining = capacity - tierAggregate.allocationConsumed;
    if (tierAggregate.activePaid === 0) {
      return {
        label: `Claim your seat — $${tier.priceCents / 100}`,
        supportingCopy: `${tierAggregate.activeHolds} checkout${tierAggregate.activeHolds === 1 ? "" : "s"} currently in progress · ${remaining} spot${remaining === 1 ? "" : "s"} remaining at this price.`,
      };
    }
    return {
      label: `Claim your seat — $${tier.priceCents / 100}`,
      supportingCopy: `${tierAggregate.activePaid} of ${capacity} claimed · ${tierAggregate.activeHolds} temporarily held in checkout · ${remaining} spot${remaining === 1 ? "" : "s"} remaining.`,
    };
  }
  if (tierAggregate.activePaid === 0) {
    return {
      label: `Claim your seat — $${tier.priceCents / 100}`,
      supportingCopy: tier.index === 1
        ? "Founding price for the first 3 students."
        : `Tier ${tier.index} price is now available.`,
    };
  }

  return {
    label: `Claim your seat — $${tier.priceCents / 100}`,
    supportingCopy: `${tierAggregate.activePaid} of ${capacity} claimed · ${capacity - tierAggregate.allocationConsumed} left.`,
  };
}

/** Derives client-safe display state from a previously normalized aggregate. */
export function deriveEnrollmentState(aggregate: EnrollmentAggregate): EnrollmentState {
  assertValidAggregate(aggregate);

  const activeIndex = activeTierIndex(aggregate);
  const enrollmentStatus = currentStatus(aggregate, activeIndex);
  const tierLadder = ladderFor(aggregate, activeIndex, enrollmentStatus);
  const activeTier = tierLadder[activeIndex - 1];
  const coachingStatus = coachingStatusFor(aggregate.coaching);
  const canStartCheckout = enrollmentStatus === "open";
  const coachingSeatsRemaining = coachingStatus === "available"
    ? COHORT.coaching.seats - aggregate.coaching.activePaid - aggregate.coaching.activeHolds
    : coachingStatus === "sold_out"
      ? 0
      : null;

  return {
    cohortSlug: COHORT.slug,
    checkoutCutoffIso: COHORT.checkoutCutoffIso,
    enrollmentStatus,
    coachingStatus,
    seatsTotal: COHORT.seats,
    seatsRemaining: canStartCheckout
      ? COHORT.seats - aggregate.capacityConsumed
      : null,
    activePaidStudents: aggregate.activePaidStudents,
    capacityConsumed: aggregate.capacityConsumed,
    coachingSeatsTotal: COHORT.coaching.seats,
    coachingSeatsClaimed: aggregate.coaching.activePaid,
    coachingSeatsHeld: aggregate.coaching.activeHolds,
    coachingSeatsRemaining,
    activeTier,
    tierLadder,
    currentCta: ctaFor(enrollmentStatus, activeTier, aggregate),
    canStartCheckout,
    requiresPriceReconfirmation: aggregate.hasOpenPreDeadlineSession,
  };
}
