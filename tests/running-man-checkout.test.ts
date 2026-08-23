import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createRunningManRepository,
  type RunningManRpcClient,
} from "../src/lib/running-man/repository";

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
