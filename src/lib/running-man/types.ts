export type EnrollmentState = {
  cohortSlug: string;
  seatsTotal: number;
  seatsRemaining: number;
  coachingSeatsTotal: number;
  coachingSeatsRemaining: number;
  cutoffIso: string;
  isOpen: boolean;
};

export type CheckoutRequest = {
  cohortSlug: string;
  tierIndex: 1 | 2 | 3;
  coaching: boolean;
  termsVersion: string;
  commitments: Record<string, boolean>;
};

export type CheckoutResult =
  | { kind: "success"; checkoutUrl: string }
  | { kind: "error"; code: "invalid_request" | "sold_out" | "closed" | "unavailable"; message: string };
