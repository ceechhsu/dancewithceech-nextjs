import { COHORT } from "./config";
import type { TierIndex } from "./types";

type RpcResponse = { data: unknown; error: { message: string; code?: string } | null };

export type RunningManRpcClient = {
  schema(schema: "private"): {
    rpc(functionName: string, args?: Record<string, unknown>): Promise<RpcResponse>;
  };
};

export type ReserveCheckoutInput = {
  expectedTier: TierIndex;
  includeCoaching: boolean;
  termsVersion: string;
  attemptHash: string;
  networkHash: string;
};

export type ReservationDecision =
  | {
    kind: "reserved";
    reservationId: string;
    expiresAt: string;
    tierIndex: TierIndex;
    baseAmountCents: number;
    includeCoaching: boolean;
  }
  | { kind: "terminal"; sessionId: string }
  | { kind: "reconfirm"; enrollmentState: Record<string, unknown> };

export type EnrollmentAggregateRecord = Record<string, unknown> & {
  hasOpenPreDeadlineSession: boolean;
};

export class RunningManRepositoryError extends Error {
  override name = "RunningManRepositoryError";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RunningManRepositoryError("The enrollment service returned an invalid response.");
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new RunningManRepositoryError(`The enrollment service did not return ${field}.`);
  }
  return value;
}

function asTierIndex(value: unknown): TierIndex {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new RunningManRepositoryError("The enrollment service did not return a valid tier.");
}

function asReservationAmount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || ![19700, 24700, 29700].includes(value)) {
    throw new RunningManRepositoryError(`The enrollment service did not return a valid ${field}.`);
  }
  return value;
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new RunningManRepositoryError(`The enrollment service did not return ${field}.`);
  }
  return value;
}

function throwForError(error: RpcResponse["error"]): never {
  throw new RunningManRepositoryError(error?.message ?? "The enrollment service is unavailable.");
}

function reconfirmation(data: Record<string, unknown>): ReservationDecision {
  const enrollmentState = data.enrollment_state;
  if (!enrollmentState || typeof enrollmentState !== "object" || Array.isArray(enrollmentState)) {
    throw new RunningManRepositoryError("The enrollment service did not return current availability.");
  }
  return { kind: "reconfirm", enrollmentState: enrollmentState as Record<string, unknown> };
}

function asEnrollmentAggregate(data: unknown): EnrollmentAggregateRecord {
  const aggregate = asRecord(data);
  if (typeof aggregate.hasOpenPreDeadlineSession === "boolean") {
    return aggregate as EnrollmentAggregateRecord;
  }
  if (typeof aggregate.has_open_pre_deadline_session === "boolean") {
    return {
      ...aggregate,
      hasOpenPreDeadlineSession: aggregate.has_open_pre_deadline_session,
    } as EnrollmentAggregateRecord;
  }
  throw new RunningManRepositoryError("The enrollment service did not return the open-session state.");
}

/**
 * Server-side boundary for the non-public inventory RPCs.  Callers can provide
 * only a tier, coaching choice, accepted terms, and an opaque attempt hash;
 * Stripe Price IDs and totals are intentionally not part of this contract.
 */
export function createRunningManRepository(client: RunningManRpcClient) {
  const privateRpc = (functionName: string, args: Record<string, unknown>) =>
    client.schema("private").rpc(functionName, args);

  return {
    async reserveCheckout(input: ReserveCheckoutInput): Promise<ReservationDecision> {
      const { data, error } = await privateRpc("reserve_running_man_checkout", {
        p_cohort_slug: COHORT.slug,
        p_expected_tier: input.expectedTier,
        p_include_coaching: input.includeCoaching,
        p_terms_version: input.termsVersion,
        p_attempt_hash: input.attemptHash,
        p_network_hash: input.networkHash,
      });
      if (error) throwForError(error);

      const result = asRecord(data);
      const resultCode = asString(result.result_code, "a result code");
      if (resultCode === "reserved" || resultCode === "existing_open") {
        return {
          kind: "reserved",
          reservationId: asString(result.reservation_id, "a reservation ID"),
          expiresAt: asString(result.expires_at, "a reservation expiry"),
          tierIndex: asTierIndex(result.tier_index),
          baseAmountCents: asReservationAmount(result.base_amount_cents, "reservation amount"),
          includeCoaching: asBoolean(result.include_coaching, "the coaching selection"),
        };
      }

      if (resultCode === "paid_terminal") {
        return { kind: "terminal", sessionId: asString(result.session_id, "a completed checkout session") };
      }

      if (["stale", "tier_held", "coaching_held", "coaching_sold_out", "coaching_under_review", "capacity_under_review", "sold_out", "closed", "selection_change_required", "stripe_expiry_verification_required", "rate_limited"].includes(resultCode)) {
        return reconfirmation(result);
      }

      throw new RunningManRepositoryError(`The enrollment service returned an unknown result: ${resultCode}.`);
    },

    async attachStripeSession(reservationId: string, sessionId: string): Promise<void> {
      const { error } = await privateRpc("attach_running_man_session", {
        p_reservation_id: reservationId,
        p_session_id: sessionId,
      });
      if (error) throwForError(error);
    },

    async getOrCreateCheckoutAttempt(input: {
      attemptHash: string;
      networkHash: string;
      includeCoaching: boolean;
    }): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("get_or_create_running_man_checkout_attempt", {
        p_cohort_slug: COHORT.slug,
        p_attempt_hash: input.attemptHash,
        p_network_hash: input.networkHash,
        p_include_coaching: input.includeCoaching,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async replaceUnpaidAttemptSelection(input: {
      attemptHash: string;
      networkHash: string;
      includeCoaching: boolean;
    }): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("replace_running_man_unpaid_attempt_selection", {
        p_cohort_slug: COHORT.slug,
        p_attempt_hash: input.attemptHash,
        p_network_hash: input.networkHash,
        p_include_coaching: input.includeCoaching,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async recoverCreatingReservation(reservationId: string): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("recover_running_man_creating_reservation", {
        p_reservation_id: reservationId,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async getEnrollmentAggregate(): Promise<EnrollmentAggregateRecord> {
      const { data, error } = await privateRpc("get_running_man_enrollment_aggregate", {
        p_cohort_slug: COHORT.slug,
      });
      if (error) throwForError(error);
      return asEnrollmentAggregate(data);
    },

    async applyStripeEventAtomically(input: {
      eventId: string;
      eventType: string;
      sessionId?: string | null;
      paymentIntentId?: string | null;
      chargeId?: string | null;
      payload: Record<string, unknown>;
    }): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("apply_running_man_stripe_event", {
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_session_id: input.sessionId ?? null,
        p_payment_intent_id: input.paymentIntentId ?? null,
        p_charge_id: input.chargeId ?? null,
        p_payload: input.payload,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async reconcileRunningManReservation(input: {
      reservationId: string;
      stripeStatus: string;
      paymentStatus: string;
      sessionId?: string | null;
      paymentIntentId?: string | null;
      chargeId?: string | null;
    }): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("reconcile_running_man_reservation", {
        p_reservation_id: input.reservationId,
        p_stripe_status: input.stripeStatus,
        p_payment_status: input.paymentStatus,
        p_session_id: input.sessionId ?? null,
        p_payment_intent_id: input.paymentIntentId ?? null,
        p_charge_id: input.chargeId ?? null,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async evaluateMinimumEnrollment(): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("evaluate_running_man_minimum", {
        p_cohort_slug: COHORT.slug,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async listRecoverableRunningManHolds(): Promise<Array<{ reservationId: string }>> {
      const { data, error } = await privateRpc("list_recoverable_running_man_holds", {
        p_cohort_slug: COHORT.slug,
        p_grace_seconds: 300,
      });
      if (error) throwForError(error);
      if (!Array.isArray(data)) throw new RunningManRepositoryError("The enrollment service did not return recovery holds.");
      return data.map((value) => {
        const hold = asRecord(value);
        return { reservationId: asString(hold.reservation_id, "a recovery reservation ID") };
      });
    },

    async releaseMissingRunningManHold(reservationId: string): Promise<Record<string, unknown>> {
      const { data, error } = await privateRpc("release_missing_running_man_hold", {
        p_reservation_id: reservationId,
        p_grace_seconds: 300,
      });
      if (error) throwForError(error);
      return asRecord(data);
    },

    async findRunningManReservationByStripe(input: {
      chargeId?: string | null;
      paymentIntentId?: string | null;
    }): Promise<{ reservationId: string; sessionId: string | null; paymentIntentId: string | null; chargeId: string | null } | null> {
      const { data, error } = await privateRpc("find_running_man_reservation_by_stripe", {
        p_charge_id: input.chargeId ?? null,
        p_payment_intent_id: input.paymentIntentId ?? null,
      });
      if (error) throwForError(error);
      if (data === null) return null;
      const reservation = asRecord(data);
      const optionalString = (value: unknown, field: string) => value === null ? null : asString(value, field);
      return {
        reservationId: asString(reservation.reservation_id, "a Stripe reservation ID"),
        sessionId: optionalString(reservation.session_id, "a Stripe session ID"),
        paymentIntentId: optionalString(reservation.payment_intent_id, "a Stripe PaymentIntent ID"),
        chargeId: optionalString(reservation.charge_id, "a Stripe charge ID"),
      };
    },

    async reopenRefundedReservation(input: {
      reservationId: string;
      actorEmail: string;
      reason: string;
    }): Promise<void> {
      const { error } = await privateRpc("reopen_running_man_reservation", {
        p_reservation_id: input.reservationId,
        p_actor_email: input.actorEmail,
        p_reason: input.reason,
      });
      if (error) throwForError(error);
    },
  };
}
