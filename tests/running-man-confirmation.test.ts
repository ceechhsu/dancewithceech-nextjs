import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyRunningManConfirmationSession,
  type ConfirmationStripeClient,
} from "../src/lib/running-man/confirmation";

const priceIds = {
  1: "price_197",
  2: "price_247",
  3: "price_297",
  coaching: "price_coaching",
};

function client(overrides: Partial<ConfirmationStripeClient> = {}): ConfirmationStripeClient {
  return {
    checkout: {
      sessions: {
        async retrieve() {
          return {
            id: "cs_test_valid",
            object: "checkout.session",
            mode: "payment",
            status: "complete",
            payment_status: "paid",
            livemode: false,
            amount_total: 29700,
            metadata: {
              running_man_reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
              running_man_cohort_slug: "running-man-method-fall-2026",
            },
          };
        },
        async listLineItems() {
          return {
            data: [
              { id: "li_tier", quantity: 1, price: { id: "price_197", currency: "usd", unit_amount: 19700 } },
              { id: "li_coaching", quantity: 1, price: { id: "price_coaching", currency: "usd", unit_amount: 10000 } },
            ],
            has_more: false,
          };
        },
      },
    },
    ...overrides,
  };
}

test("verifies a paid Running Man session from trusted metadata and line items", async () => {
  const result = await verifyRunningManConfirmationSession(client(), "cs_test_valid", priceIds, false);

  assert.deepEqual(result, {
    kind: "success",
    sessionId: "cs_test_valid",
    tierIndex: 1,
    includeCoaching: true,
    totalAmountCents: 29700,
  });
});

test("returns pending for an unpaid session without exposing customer data", async () => {
  const result = await verifyRunningManConfirmationSession(client({
    checkout: {
      sessions: {
        async retrieve() {
          return {
            id: "cs_test_pending",
            object: "checkout.session",
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            livemode: false,
            amount_total: 19700,
            metadata: {
              running_man_reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
              running_man_cohort_slug: "running-man-method-fall-2026",
            },
          };
        },
        async listLineItems() { return { data: [], has_more: false }; },
      },
    },
  }), "cs_test_pending", priceIds, false);

  assert.deepEqual(result, { kind: "pending" });
});

test("rejects a session with an untrusted or altered line item", async () => {
  const result = await verifyRunningManConfirmationSession(client({
    checkout: {
      sessions: {
        async retrieve() {
          return {
            id: "cs_test_tampered",
            object: "checkout.session",
            mode: "payment",
            status: "complete",
            payment_status: "paid",
            livemode: false,
            amount_total: 29700,
            metadata: {
              running_man_reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
              running_man_cohort_slug: "running-man-method-fall-2026",
            },
          };
        },
        async listLineItems() {
          return {
            data: [{ id: "li_bad", quantity: 1, price: { id: "price_197", currency: "usd", unit_amount: 19700 } }],
            has_more: false,
          };
        },
      },
    },
  }), "cs_test_tampered", priceIds, false);

  assert.deepEqual(result, { kind: "invalid" });
});

test("rejects a live-mode session when test mode is configured", async () => {
  const result = await verifyRunningManConfirmationSession(client({
    checkout: {
      sessions: {
        async retrieve() {
          return {
            id: "cs_live_wrong_mode",
            object: "checkout.session",
            mode: "payment",
            status: "complete",
            payment_status: "paid",
            livemode: true,
            amount_total: 29700,
            metadata: {
              running_man_reservation_id: "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9",
              running_man_cohort_slug: "running-man-method-fall-2026",
            },
          };
        },
        async listLineItems() { return { data: [], has_more: false }; },
      },
    },
  }), "cs_live_wrong_mode", priceIds, false);

  assert.deepEqual(result, { kind: "invalid" });
});
