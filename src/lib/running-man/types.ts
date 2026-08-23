export type TierIndex = 1 | 2 | 3;

export type EnrollmentStatus =
  | "open"
  | "tier_held"
  | "capacity_under_review"
  | "sold_out"
  | "closed";

export type CoachingStatus = "available" | "held" | "under_review" | "sold_out";

export type TierLadderStatus =
  | "active"
  | "complete"
  | "held"
  | "upcoming"
  | "under_review"
  | "unavailable";

export type EnrollmentTier = {
  index: TierIndex;
  ceiling: number;
  priceCents: number;
  status: TierLadderStatus;
  capacity: number;
  claimed: number;
  remaining: number;
};

/** Client-safe derived enrollment view; it contains no customer or payment data. */
export type EnrollmentState = {
  cohortSlug: string;
  checkoutCutoffIso: string;
  enrollmentStatus: EnrollmentStatus;
  coachingStatus: CoachingStatus;
  seatsTotal: number;
  seatsRemaining: number | null;
  activePaidStudents: number;
  capacityConsumed: number;
  coachingSeatsTotal: number;
  coachingSeatsClaimed: number;
  coachingSeatsHeld: number;
  coachingSeatsRemaining: number | null;
  activeTier: EnrollmentTier;
  tierLadder: readonly EnrollmentTier[];
  currentCta: {
    label: string;
    supportingCopy: string;
  };
  canStartCheckout: boolean;
  requiresPriceReconfirmation: boolean;
};

/** Public response from the availability route. Never includes customer or Stripe data. */
export type EnrollmentStateResponse =
  | {
    kind: "available";
    state: EnrollmentState;
    asOf: string;
  }
  | {
    kind: "unavailable";
    asOf: string;
    message: string;
  };

export type CheckoutRequest = {
  cohortSlug: string;
  tierIndex: TierIndex;
  coaching: boolean;
  termsVersion: string;
  commitments: Record<string, boolean>;
};

export type CheckoutResult =
  | { kind: "success"; checkoutUrl: string }
  | { kind: "error"; code: "invalid_request" | "sold_out" | "closed" | "unavailable"; message: string };
