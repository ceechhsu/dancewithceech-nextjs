import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createRunningManRepository,
  type RunningManRpcClient,
} from "../src/lib/running-man/repository";
import {
  createRunningManCheckout,
  createSignedAttemptCookie,
  type CheckoutServiceDependencies,
} from "../src/lib/running-man/checkout";
import { CURRENT_TERMS_VERSION } from "../src/lib/running-man/terms";

const checkoutAttemptSecret = "checkout-test-secret-that-is-long-enough-to-be-safe";
const fixedNow = new Date("2026-09-01T00:00:00.000Z");
const reservationId = "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9";

function checkoutRequest(overrides: Partial<{
  expectedTier: 1 | 2 | 3;
  includeCoaching: boolean;
  termsVersion: string;
  acknowledged: boolean;
}> = {}) {
  return {
    expectedTier: 1 as const,
    includeCoaching: false,
    termsVersion: CURRENT_TERMS_VERSION,
    acknowledged: true,
    ...overrides,
  };
}

type CheckoutCall = { params: Record<string, unknown>; options?: Record<string, unknown> };

function checkoutDependencies(overrides: Partial<CheckoutServiceDependencies> = {}) {
  const createCalls: CheckoutCall[] = [];
  const attachCalls: Array<{ reservationId: string; sessionId: string }> = [];
  const reserveCalls: unknown[] = [];
  const reconcileCalls: unknown[] = [];
  const replaceCalls: unknown[] = [];

  const dependencies: CheckoutServiceDependencies = {
    now: () => fixedNow,
    attemptSecret: checkoutAttemptSecret,
    priceIds: {
      1: "price_197",
      2: "price_247",
      3: "price_297",
      coaching: "price_coaching",
    },
    repository: {
      async reserveCheckout(input) {
        reserveCalls.push(input);
        return {
          kind: "reserved",
          reservationId,
          expiresAt: "2026-09-01T00:30:00.000Z",
        };
      },
      async attachStripeSession(id, sessionId) {
        attachCalls.push({ reservationId: id, sessionId });
      },
      async replaceUnpaidAttemptSelection(input) {
        replaceCalls.push(input);
        return { result_code: "selection_updated" };
      },
      async recoverCreatingReservation() {
        return { result_code: "scan_required" };
      },
      async reconcileRunningManReservation(input) {
        reconcileCalls.push(input);
        return { result_code: "reconciled" };
      },
    },
    stripe: {
      checkout: {
        sessions: {
          async create(params, options) {
            createCalls.push({ params: params as Record<string, unknown>, options: options as Record<string, unknown> });
            return { id: "cs_created", url: "https://checkout.stripe.test/cs_created", status: "open", payment_status: "unpaid", metadata: {} };
          },
          async retrieve() {
            return { id: "cs_created", url: "https://checkout.stripe.test/cs_created", status: "open", payment_status: "unpaid", metadata: {} };
          },
          async expire() {
            return { id: "cs_created", url: null, status: "expired", payment_status: "unpaid", metadata: {} };
          },
          async list() {
            return { data: [], has_more: false };
          },
        },
      },
    },
    ...overrides,
  };

  return { dependencies, createCalls, attachCalls, reserveCalls, reconcileCalls, replaceCalls };
}

test("creates exactly one fixed cohort line item for a valid $197 reservation", async () => {
  const { dependencies, createCalls, attachCalls } = checkoutDependencies();

  const result = await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(result, {
    kind: "checkout",
    checkoutUrl: "https://checkout.stripe.test/cs_created",
    setAttemptCookie: result.setAttemptCookie,
  });
  assert.deepEqual(createCalls[0].params.line_items, [{ price: "price_197", quantity: 1 }]);
  assert.equal(attachCalls.length, 1);
});

test("adds the fixed coaching line item only when the reservation selected coaching", async () => {
  const { dependencies, createCalls } = checkoutDependencies();

  await createRunningManCheckout(dependencies, {
    request: checkoutRequest({ includeCoaching: true }),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(createCalls[0].params.line_items, [
    { price: "price_197", quantity: 1 },
    { price: "price_coaching", quantity: 1 },
  ]);
});

test("uses reservation ID as Stripe idempotency key and metadata", async () => {
  const { dependencies, createCalls } = checkoutDependencies();

  await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.equal(createCalls[0].options?.idempotencyKey, reservationId);
  assert.deepEqual(createCalls[0].params.metadata, {
    running_man_reservation_id: reservationId,
    running_man_cohort_slug: "running-man-method-fall-2026",
  });
});

test("writes trusted reservation metadata to the PaymentIntent for pre-completion refund recovery", async () => {
  const { dependencies, createCalls } = checkoutDependencies();

  await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(createCalls[0].params.payment_intent_data, {
    metadata: {
      running_man_reservation_id: reservationId,
      running_man_cohort_slug: "running-man-method-fall-2026",
    },
  });
});

test("reuses a matching active browser attempt without a second hold", async () => {
  const { dependencies, createCalls, reserveCalls } = checkoutDependencies({
    findSessionByAttempt: async () => ({
      id: "cs_existing",
      url: "https://checkout.stripe.test/cs_existing",
      status: "open",
      payment_status: "unpaid",
      includeCoaching: false,
      metadata: { running_man_reservation_id: reservationId },
    }),
  });
  const attemptCookie = createSignedAttemptCookie("already-issued-attempt", checkoutAttemptSecret, fixedNow);

  const result = await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    attemptCookie,
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(result, {
    kind: "checkout",
    checkoutUrl: "https://checkout.stripe.test/cs_existing",
  });
  assert.equal(createCalls.length, 0);
  assert.equal(reserveCalls.length, 1);
});

test("issues a new signed attempt cookie before first checkout", async () => {
  const { dependencies } = checkoutDependencies();

  const result = await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.equal(result.kind, "checkout");
  if (result.kind !== "checkout") return;
  assert.match(result.setAttemptCookie ?? "", /^running_man_checkout_attempt=[^;]+; HttpOnly; Secure; SameSite=Lax; Path=\/api\/running-man; Max-Age=1800$/);
});

test("changing coaching selection expires the prior unpaid session before creating a replacement", async () => {
  let reserveCount = 0;
  const { dependencies, createCalls, reconcileCalls, replaceCalls } = checkoutDependencies({
    repository: {
      async reserveCheckout() {
        reserveCount += 1;
        if (reserveCount === 1) return { kind: "reconfirm", enrollmentState: { activeTier: 1 } };
        return { kind: "reserved", reservationId: "replacement-reservation", expiresAt: "2026-09-01T00:30:00.000Z" };
      },
      async attachStripeSession() {},
      async replaceUnpaidAttemptSelection(input) {
        replaceCalls.push(input);
        return { result_code: "selection_updated" };
      },
      async recoverCreatingReservation() { return { result_code: "scan_required" }; },
      async reconcileRunningManReservation(input) {
        reconcileCalls.push(input);
        return { result_code: "reconciled" };
      },
    },
    findSessionByAttempt: async () => ({
      id: "cs_old",
      url: "https://checkout.stripe.test/cs_old",
      status: "open",
      payment_status: "unpaid",
      includeCoaching: false,
      metadata: { running_man_reservation_id: reservationId },
    }),
    stripe: {
      checkout: {
        sessions: {
          async create(params, options) {
            createCalls.push({ params: params as Record<string, unknown>, options: options as Record<string, unknown> });
            return { id: "cs_replacement", url: "https://checkout.stripe.test/cs_replacement", status: "open", payment_status: "unpaid", metadata: {} };
          },
          async retrieve() {
            return { id: "cs_old", url: null, status: "expired", payment_status: "unpaid", metadata: { running_man_reservation_id: reservationId } };
          },
          async expire() {
            return { id: "cs_old", url: null, status: "expired", payment_status: "unpaid", metadata: {} };
          },
          async list() { return { data: [], has_more: false }; },
        },
      },
    },
  });
  const attemptCookie = createSignedAttemptCookie("selection-change-attempt", checkoutAttemptSecret, fixedNow);

  const result = await createRunningManCheckout(dependencies, {
    request: checkoutRequest({ includeCoaching: true }),
    attemptCookie,
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.equal(result.kind, "checkout");
  assert.equal(reconcileCalls.length, 1);
  assert.equal(replaceCalls.length, 1);
  assert.equal(createCalls.length, 1);
  assert.deepEqual(createCalls[0].params.line_items, [
    { price: "price_197", quantity: 1 },
    { price: "price_coaching", quantity: 1 },
  ]);
});

test("returns reconfirmation without a reservation when current tier or coaching changed", async () => {
  const { dependencies, createCalls } = checkoutDependencies({
    repository: {
      async reserveCheckout() { return { kind: "reconfirm", enrollmentState: { activeTier: 2, coachingStatus: "held" } }; },
      async attachStripeSession() {},
      async replaceUnpaidAttemptSelection() { return { result_code: "selection_updated" }; },
      async recoverCreatingReservation() { return { result_code: "scan_required" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
    },
  });

  const result = await createRunningManCheckout(dependencies, {
    request: checkoutRequest(),
    attemptCookie: createSignedAttemptCookie("stale-attempt", checkoutAttemptSecret, fixedNow),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(result, { kind: "reconfirm", enrollmentState: { activeTier: 2, coachingStatus: "held" } });
  assert.equal(createCalls.length, 0);
});

test("rejects missing acknowledgment, stale terms, and post-cutoff requests", async () => {
  const { dependencies } = checkoutDependencies();

  const missingAcknowledgment = await createRunningManCheckout(dependencies, {
    request: checkoutRequest({ acknowledged: false }),
    networkSignal: "203.0.113.10|test-agent",
  });
  const staleTerms = await createRunningManCheckout(dependencies, {
    request: checkoutRequest({ termsVersion: "old-terms" }),
    networkSignal: "203.0.113.10|test-agent",
  });
  const afterCutoff = await createRunningManCheckout({ ...dependencies, now: () => new Date("2026-09-19T00:00:00.000Z") }, {
    request: checkoutRequest(),
    networkSignal: "203.0.113.10|test-agent",
  });

  assert.deepEqual(missingAcknowledgment, { kind: "error", code: "invalid_request", message: "Please confirm the enrollment commitments before checkout." });
  assert.deepEqual(staleTerms, { kind: "reconfirm", enrollmentState: { termsVersion: CURRENT_TERMS_VERSION } });
  assert.deepEqual(afterCutoff, { kind: "error", code: "closed", message: "Enrollment is closed." });
});

type RpcCall = { fn: string; args: Record<string, unknown> };

function fakeClient(results: unknown[]): { client: RunningManRpcClient; calls: RpcCall[] } {
  const calls: RpcCall[] = [];
  let index = 0;

  return {
    calls,
    client: {
      schema(schema: string) {
        assert.equal(schema, "private");
        return {
          async rpc(fn: string, args: Record<string, unknown>) {
            calls.push({ fn, args });
            return { data: results[index++], error: null };
          },
        };
      },
    },
  };
}

const reservationInput = {
  expectedTier: 1 as const,
  includeCoaching: false,
  termsVersion: "running-man-2026-08-22",
  attemptHash: "test-attempt-hash",
  networkHash: "test-network-hash",
};

test("a stale confirmed tier returns the latest state without a reservation", async () => {
  const { client, calls } = fakeClient([{
    result_code: "stale",
    enrollment_state: { activeTier: 2 },
  }]);
  const repository = createRunningManRepository(client);

  const result = await repository.reserveCheckout(reservationInput);

  assert.deepEqual(result, { kind: "reconfirm", enrollmentState: { activeTier: 2 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fn, "reserve_running_man_checkout");
});

test("a cohort-only checkout never reserves coaching", async () => {
  const { client, calls } = fakeClient([{
    result_code: "reserved",
    reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expires_at: "2026-09-01T00:30:00.000Z",
  }]);
  const repository = createRunningManRepository(client);

  await repository.reserveCheckout(reservationInput);

  assert.equal(calls[0].args.p_include_coaching, false);
});

test("the final coaching slot allows one concurrent reservation only", async () => {
  const { client, calls } = fakeClient([
    {
      result_code: "reserved",
      reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
      expires_at: "2026-09-01T00:30:00.000Z",
    },
    { result_code: "coaching_held", enrollment_state: { coachingStatus: "held" } },
  ]);
  const repository = createRunningManRepository(client);

  const [first, second] = await Promise.all([
    repository.reserveCheckout({ ...reservationInput, includeCoaching: true, attemptHash: "one" }),
    repository.reserveCheckout({ ...reservationInput, includeCoaching: true, attemptHash: "two" }),
  ]);

  assert.equal(first.kind, "reserved");
  assert.deepEqual(second, { kind: "reconfirm", enrollmentState: { coachingStatus: "held" } });
  assert.equal(calls.filter((call) => call.args.p_include_coaching === true).length, 2);
});

test("parallel requests from one checkout-attempt cookie create one active reservation only", async () => {
  const reservation = {
    result_code: "reserved",
    reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expires_at: "2026-09-01T00:30:00.000Z",
  };
  const { client } = fakeClient([reservation, reservation]);
  const repository = createRunningManRepository(client);

  const results = await Promise.all([
    repository.reserveCheckout(reservationInput),
    repository.reserveCheckout(reservationInput),
  ]);

  assert.deepEqual(results.map((result) => result.kind), ["reserved", "reserved"]);
  assert.equal(results[0].kind === "reserved" ? results[0].reservationId : null,
    results[1].kind === "reserved" ? results[1].reservationId : null);
});

test("a direct client Price ID is ignored", async () => {
  const { client, calls } = fakeClient([{
    result_code: "reserved",
    reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expires_at: "2026-09-01T00:30:00.000Z",
  }]);
  const repository = createRunningManRepository(client);

  await repository.reserveCheckout({ ...reservationInput, priceId: "price_attacker" } as typeof reservationInput);

  assert.equal("priceId" in calls[0].args, false);
  assert.deepEqual(Object.keys(calls[0].args).sort(), [
    "p_attempt_hash",
    "p_cohort_slug",
    "p_expected_tier",
    "p_include_coaching",
    "p_network_hash",
    "p_terms_version",
  ]);
});

test("the repository sends the hashed network signal to the only atomic reservation RPC", async () => {
  const { client, calls } = fakeClient([{
    result_code: "reserved",
    reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expires_at: "2026-09-01T00:30:00.000Z",
  }]);
  const repository = createRunningManRepository(client);

  await repository.reserveCheckout(reservationInput);

  assert.equal(calls[0].fn, "reserve_running_man_checkout");
  assert.equal(calls[0].args.p_network_hash, "test-network-hash");
});

test("the repository has private recovery, attempt, selection, and aggregate boundaries", async () => {
  const { client, calls } = fakeClient([
    { attempt_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9" },
    { attempt_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9", selected_coaching: true },
    { result_code: "recovered" },
    { active_paid_students: 2, has_open_pre_deadline_session: true },
  ]);
  const repository = createRunningManRepository(client);

  await repository.getOrCreateCheckoutAttempt({ attemptHash: "attempt", networkHash: "network", includeCoaching: false });
  await repository.replaceUnpaidAttemptSelection({ attemptHash: "attempt", networkHash: "network", includeCoaching: true });
  await repository.recoverCreatingReservation("c7211c55-0e09-4a2f-b1cb-8d98b9501ee9");
  const aggregate = await repository.getEnrollmentAggregate();

  assert.deepEqual(calls.map((call) => call.fn), [
    "get_or_create_running_man_checkout_attempt",
    "replace_running_man_unpaid_attempt_selection",
    "recover_running_man_creating_reservation",
    "get_running_man_enrollment_aggregate",
  ]);
  assert.equal(calls[0].args.p_network_hash, "network");
  assert.equal(calls[1].args.p_include_coaching, true);
  assert.equal(aggregate.hasOpenPreDeadlineSession, true);
});

test("a valid pre-deadline session can be reused after the cutoff", async () => {
  const { client } = fakeClient([{
    result_code: "existing_open",
    reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expires_at: "2026-09-18T07:28:00.000Z",
  }]);
  const repository = createRunningManRepository(client);

  const result = await repository.reserveCheckout(reservationInput);

  assert.deepEqual(result, {
    kind: "reserved",
    reservationId: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
    expiresAt: "2026-09-18T07:28:00.000Z",
  });
});

test("the migration keeps an earlier tier held and never advances its price", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260823004430_running_man_enrollment.sql", import.meta.url), "utf8");

  assert.match(migration, /v_allocations \+ v_holds = v_capacity and v_allocations < v_capacity[\s\S]*?result_code', 'tier_held'/);
  assert.match(migration, /v_active_tier := v_tier;[\s\S]*?exit;/);
});

test("the migration lets a paid completion win over expiry without overwriting review states", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260823004430_running_man_enrollment.sql", import.meta.url), "utf8");

  assert.match(migration, /v_old_state in \('creating_checkout', 'checkout_open', 'released'\).*?v_new_state := 'paid'/);
  assert.match(migration, /p_payment_status = 'paid' and v_reservation\.state in \('creating_checkout', 'checkout_open', 'released'\)/);
});

test("the migration records refund review only after a full trusted refund signal", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260823004430_running_man_enrollment.sql", import.meta.url), "utf8");

  assert.match(migration, /v_full_refund := coalesce\(\(p_payload ->> 'amount_refunded'\)::bigint/);
  assert.match(migration, /if v_full_refund and v_old_state/);
  assert.match(migration, /v_reservation\.state <> 'refund_review' or v_reservation\.fully_refunded_at is null/);
});

test("the migration preserves unattached checkout holds until trusted Stripe verification", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260823004430_running_man_enrollment.sql", import.meta.url), "utf8");
  const replacement = migration.slice(
    migration.indexOf("create or replace function private.replace_running_man_unpaid_attempt_selection"),
    migration.indexOf("create or replace function private.recover_running_man_creating_reservation"),
  );
  const recovery = migration.slice(
    migration.indexOf("create or replace function private.recover_running_man_creating_reservation"),
    migration.indexOf("create or replace function private.get_running_man_enrollment_aggregate"),
  );

  assert.doesNotMatch(replacement, /set state = 'released'/);
  assert.match(replacement, /stripe_expiry_verification_required/);
  assert.doesNotMatch(recovery, /set state = 'released'/);
  assert.match(recovery, /scan_required/);
});

test("the aggregate contract includes a pre-deadline open-session signal", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260823004430_running_man_enrollment.sql", import.meta.url), "utf8");

  assert.match(migration, /'hasOpenPreDeadlineSession'/);
});
