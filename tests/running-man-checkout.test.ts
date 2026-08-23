import assert from "node:assert/strict";
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
    "p_terms_version",
  ]);
});
