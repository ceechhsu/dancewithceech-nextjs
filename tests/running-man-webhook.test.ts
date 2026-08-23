import assert from "node:assert/strict";
import test from "node:test";

import {
  RunningManWebhookValidationError,
  finalizeRunningManStripeEvent,
  hasRunningManCronAuthorization,
  assertRunningManOwnerAlertConfiguration,
  notifyRunningManOwner,
  parseRunningManStripeLivemode,
  reconcileRunningManStripeSessions,
  type RunningManWebhookDependencies,
} from "../src/lib/running-man/webhook";

const reservationId = "c7211c55-0e09-4a2f-b1cb-8d98b9501ee9";
const priceIds = { 1: "price_197", 2: "price_247", 3: "price_297", coaching: "price_coaching" };

test("accepts only an exact Bearer token for protected Running Man reconciliation", () => {
  assert.equal(hasRunningManCronAuthorization(new Headers({ authorization: "Bearer cron-secret" }), "cron-secret"), true);
  assert.equal(hasRunningManCronAuthorization(new Headers({ authorization: "Bearer cron-secret-extra" }), "cron-secret"), false);
  assert.equal(hasRunningManCronAuthorization(new Headers({ authorization: "Basic cron-secret" }), "cron-secret"), false);
});

test("requires an explicit true/false Stripe livemode configuration", () => {
  assert.equal(parseRunningManStripeLivemode("true"), true);
  assert.equal(parseRunningManStripeLivemode("false"), false);
  assert.throws(() => parseRunningManStripeLivemode(undefined), RunningManWebhookValidationError);
  assert.throws(() => parseRunningManStripeLivemode("test"), RunningManWebhookValidationError);
});

test("requires configured Resend owner-alert delivery in live mode but permits test no-op", () => {
  assert.doesNotThrow(() => assertRunningManOwnerAlertConfiguration(false, { apiKey: undefined, from: undefined, to: undefined }));
  assert.throws(
    () => assertRunningManOwnerAlertConfiguration(true, { apiKey: "api", from: "sender@example.com", to: undefined }),
    RunningManWebhookValidationError,
  );
});

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_running_man",
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    payment_intent: "pi_running_man",
    metadata: {
      running_man_reservation_id: reservationId,
      running_man_cohort_slug: "running-man-method-fall-2026",
    },
    ...overrides,
  };
}

function lineItems(items = [
  { quantity: 1, price: { id: "price_197", currency: "usd", unit_amount: 19700 } },
]) {
  return { data: items, has_more: false };
}

function dependencies(overrides: Partial<RunningManWebhookDependencies> = {}) {
  const applyCalls: unknown[] = [];
  const reconcileCalls: unknown[] = [];
  const listCalls: unknown[] = [];
  const currentSession = session();
  const deps: RunningManWebhookDependencies = {
    priceIds,
    repository: {
      async applyStripeEventAtomically(input) { applyCalls.push(input); return { result_code: "applied" }; },
      async reconcileRunningManReservation(input) { reconcileCalls.push(input); return { result_code: "reconciled" }; },
      async evaluateMinimumEnrollment() { return { result_code: "pending" }; },
    },
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return currentSession; },
          async listLineItems() { return lineItems(); },
          async list(params) { listCalls.push(params); return { data: [currentSession], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: currentSession.metadata }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: currentSession.metadata, amount: 19700, amount_refunded: 19700 }; } },
    },
    ...overrides,
  };
  return { deps, applyCalls, reconcileCalls, listCalls, currentSession };
}

test("finalizes only a Stripe-verified paid checkout with the exact configured line items", async () => {
  const { deps, applyCalls } = dependencies();
  const result = await finalizeRunningManStripeEvent(deps, {
    id: "evt_paid", type: "checkout.session.completed", livemode: false, data: { object: session() },
  });

  assert.equal(result.kind, "applied");
  assert.equal(applyCalls.length, 1);
  assert.deepEqual(applyCalls[0], {
    eventId: "evt_paid",
    eventType: "checkout.session.completed",
    sessionId: "cs_running_man",
    paymentIntentId: "pi_running_man",
    chargeId: null,
    payload: { amount_total: undefined, amount_refunded: undefined, id: "cs_running_man", payment_status: "paid" },
  });
});

test("rejects a completed checkout when a paginated line-item page has an unapproved item", async () => {
  const { deps, applyCalls } = dependencies({
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return session(); },
          async listLineItems(_, params) {
            return params?.starting_after
              ? lineItems([{ quantity: 1, price: { id: "price_not_allowed", currency: "usd", unit_amount: 1 } }])
              : { ...lineItems(), has_more: true };
          },
          async list() { return { data: [], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  await assert.rejects(
    () => finalizeRunningManStripeEvent(deps, { id: "evt_bad_line", type: "checkout.session.completed", livemode: false, data: { object: session() } }),
    RunningManWebhookValidationError,
  );
  assert.equal(applyCalls.length, 0);
});

test("does not release a hold on an expiry event until Stripe confirms expired and unpaid", async () => {
  const { deps, applyCalls } = dependencies({
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return session({ status: "open", payment_status: "unpaid" }); },
          async listLineItems() { return lineItems(); },
          async list() { return { data: [], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  await assert.rejects(
    () => finalizeRunningManStripeEvent(deps, { id: "evt_expired", type: "checkout.session.expired", livemode: false, data: { object: session({ status: "expired", payment_status: "unpaid" }) } }),
    RunningManWebhookValidationError,
  );
  assert.equal(applyCalls.length, 0);
});

test("applies full refunds for a persisted charge, but keeps partial refunds as an audit-only event", async () => {
  let refundLookup = 0;
  const { deps, applyCalls } = dependencies({
    stripe: {
      checkout: { sessions: { async retrieve() { return session(); }, async listLineItems() { return lineItems(); }, async list() { return { data: [], has_more: false }; } } },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: session().metadata }; } },
      charges: {
        async retrieve() {
          refundLookup += 1;
          return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: refundLookup === 1 ? 19700 : 5000 };
        },
      },
    },
  });
  const full = await finalizeRunningManStripeEvent(deps, {
    id: "evt_refund_full", type: "charge.refunded", livemode: false,
    data: { object: { id: "ch_running_man", payment_intent: "pi_running_man", amount: 19700, amount_refunded: 19700 } },
  });
  const partial = await finalizeRunningManStripeEvent(deps, {
    id: "evt_refund_partial", type: "charge.refunded", livemode: false,
    data: { object: { id: "ch_running_man", payment_intent: "pi_running_man", amount: 19700, amount_refunded: 5000 } },
  });

  assert.equal(full.kind, "applied");
  assert.equal(partial.kind, "audit_only");
  assert.equal(applyCalls.length, 2);
  assert.equal((applyCalls[1] as { eventType: string }).eventType, "charge.refunded");
});

test("keeps unknown charge events retryable instead of sending them to the dedupe RPC", async () => {
  const { deps, applyCalls } = dependencies({
    stripe: {
      checkout: { sessions: { async retrieve() { return session(); }, async listLineItems() { return lineItems(); }, async list() { return { data: [], has_more: false }; } } },
      paymentIntents: { async retrieve() { return { id: "pi_unknown", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_unknown", payment_intent: "pi_unknown", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  await assert.rejects(
    () => finalizeRunningManStripeEvent(deps, { id: "evt_unknown", type: "charge.dispute.created", livemode: false, data: { object: { id: "dp_unknown", charge: "ch_unknown", payment_intent: "pi_unknown" } } }),
    RunningManWebhookValidationError,
  );
  assert.equal(applyCalls.length, 0);
});

test("ignores signed events for other Stripe products without retrying or alerting", async () => {
  const { deps, applyCalls } = dependencies({
    stripe: {
      checkout: { sessions: { async retrieve() { return session({ metadata: {} }); }, async listLineItems() { return lineItems(); }, async list() { return { data: [], has_more: false }; } } },
      paymentIntents: { async retrieve() { return { id: "pi_other", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_other", payment_intent: "pi_other", metadata: {}, amount: 100, amount_refunded: 0 }; } },
    },
  });
  const alerts: unknown[] = [];
  Object.assign(deps as object, { notifyOwner: async (alert: unknown) => { alerts.push(alert); } });

  const result = await finalizeRunningManStripeEvent(deps, {
    id: "evt_other", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_other" } },
  });
  assert.deepEqual(result, { kind: "ignored" });
  assert.equal(applyCalls.length, 0);
  assert.deepEqual(alerts, []);
});

test("uses a persisted charge identity before falling back to PaymentIntent metadata", async () => {
  let paymentIntentRetrieved = false;
  const { deps, applyCalls } = dependencies({
    repository: {
      async applyStripeEventAtomically(input) { applyCalls.push(input); return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async evaluateMinimumEnrollment() { return { result_code: "pending" }; },
      async findRunningManReservationByStripe() {
        return { reservationId, sessionId: "cs_running_man", paymentIntentId: "pi_running_man", chargeId: "ch_running_man" };
      },
    },
    stripe: {
      checkout: { sessions: { async retrieve() { return session(); }, async listLineItems() { return lineItems(); }, async list() { return { data: [], has_more: false }; } } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
      paymentIntents: {
        async retrieve() {
          paymentIntentRetrieved = true;
          throw new Error("should not be called for a persisted charge");
        },
      },
    },
  });

  const result = await finalizeRunningManStripeEvent(deps, {
    id: "evt_persisted_charge", type: "charge.dispute.created", livemode: false,
    data: { object: { id: "dp_persisted", charge: "ch_running_man", payment_intent: "pi_running_man" } },
  });
  assert.equal(result.kind, "applied");
  assert.equal(paymentIntentRetrieved, false);
  assert.equal(applyCalls.length, 1);
});

test("does not send a refund-review alert for a dispute event", async () => {
  const alerts: unknown[] = [];
  const { deps } = dependencies();
  Object.assign(deps as object, { notifyOwner: async (alert: unknown) => { alerts.push(alert); } });

  await finalizeRunningManStripeEvent(deps, {
    id: "evt_dispute_no_refund_alert", type: "charge.dispute.created", livemode: false,
    data: { object: { id: "dp_1", charge: "ch_running_man", payment_intent: "pi_running_man" } },
  });
  assert.deepEqual(alerts, []);
});

test("does not deliver an alert while another worker holds its durable lease", async () => {
  const alerts: unknown[] = [];
  const { deps } = dependencies();
  Object.assign(deps.repository as object, {
    async claimRunningManOwnerAlert() { return { action: "leased_by_other" }; },
  });
  Object.assign(deps as object, { notifyOwner: async (alert: unknown) => { alerts.push(alert); } });

  await notifyRunningManOwner(deps, { kind: "refund_review", eventId: "evt_leased", partial: true });
  assert.deepEqual(alerts, []);
});

test("reconciliation scans paginated Stripe metadata, preserves uncertain holds, and waits to evaluate the minimum", async () => {
  const { deps, reconcileCalls, listCalls } = dependencies({
    stripe: {
      checkout: {
        sessions: {
          async retrieve(id) { return id === "cs_expired" ? session({ id, status: "expired", payment_status: "unpaid" }) : session({ id, status: "open", payment_status: "unpaid" }); },
          async listLineItems() { return lineItems(); },
          async list(params) {
            listCalls.push(params);
            return params?.starting_after
              ? { data: [session({ id: "cs_expired", status: "expired", payment_status: "unpaid" })], has_more: false }
              : { data: [session({ id: "cs_ambiguous", status: "open", payment_status: "unpaid" })], has_more: true };
          },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  const result = await reconcileRunningManStripeSessions(deps);
  assert.deepEqual(result, { scanned: 2, reconciled: 2, minimumEvaluated: false });
  assert.equal(reconcileCalls.length, 1);
  assert.equal(listCalls.length, 2);
});

test("recovery attaches a trusted open Stripe session to its creating hold before preserving capacity", async () => {
  const attached: Array<{ reservationId: string; sessionId: string }> = [];
  const { deps } = dependencies({
    repository: {
      async applyStripeEventAtomically() { return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async attachRecoveredRunningManSession(input) { attached.push(input); return { result_code: "attached" }; },
      async evaluateMinimumEnrollment() { return { result_code: "pending" }; },
    },
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return session({ status: "open", payment_status: "unpaid" }); },
          async listLineItems() { return lineItems(); },
          async list() { return { data: [session({ status: "open", payment_status: "unpaid" })], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  const result = await reconcileRunningManStripeSessions(deps);
  assert.deepEqual(attached, [{ reservationId, sessionId: "cs_running_man" }]);
  assert.deepEqual(result, { scanned: 1, reconciled: 1, minimumEvaluated: false });
});

test("alerts the owner for refund review and an under-minimum cohort without sending from tests by default", async () => {
  const alerts: unknown[] = [];
  const { deps } = dependencies({
    repository: {
      async applyStripeEventAtomically() { return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async evaluateMinimumEnrollment() { return { result_code: "owner_notification_required", activePaid: 7 }; },
    },
    stripe: {
      checkout: { sessions: { async retrieve() { return session(); }, async listLineItems() { return lineItems(); }, async list() { return { data: [session()], has_more: false }; } } },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: session().metadata }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 5000 }; } },
    },
  });
  Object.assign(deps as object, { notifyOwner: async (alert: unknown) => { alerts.push(alert); } });

  await finalizeRunningManStripeEvent(deps, {
    id: "evt_partial_alert", type: "charge.refunded", livemode: false,
    data: { object: { id: "ch_running_man", payment_intent: "pi_running_man" } },
  });
  await reconcileRunningManStripeSessions(deps);

  assert.deepEqual(alerts, [
    { kind: "refund_review", eventId: "evt_partial_alert", partial: true },
    { kind: "minimum_enrollment_under_8", activePaid: 7 },
  ]);
});

test("releases only an aged creating hold that is absent after a completed Stripe scan", async () => {
  const released: string[] = [];
  let evaluated = 0;
  const { deps } = dependencies({
    repository: {
      async applyStripeEventAtomically() { return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async listRecoverableRunningManHolds() { return [{ reservationId }, { reservationId: "b0a98f51-59de-4cbb-9bdf-9d6bf9c74c3d" }]; },
      async releaseMissingRunningManHold(id) { released.push(id); return { result_code: "released" }; },
      async evaluateMinimumEnrollment() { evaluated += 1; return { result_code: "minimum_met" }; },
    },
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return session({ status: "expired", payment_status: "unpaid" }); },
          async listLineItems() { return lineItems(); },
          async list() { return { data: [session({ status: "expired", payment_status: "unpaid" })], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  const result = await reconcileRunningManStripeSessions(deps);
  assert.deepEqual(released, ["b0a98f51-59de-4cbb-9bdf-9d6bf9c74c3d"]);
  assert.equal(evaluated, 1);
  assert.deepEqual(result, { scanned: 1, reconciled: 2, minimumEvaluated: true });
});

test("releases separately-listed stale unattached holds after the bounded Stripe scan", async () => {
  const released: string[] = [];
  const { deps } = dependencies({
    repository: {
      async applyStripeEventAtomically() { return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async listRecoverableRunningManHolds() { return []; },
      async releaseMissingRunningManHold() { return { result_code: "released" }; },
      async listStaleUnattachedRunningManHolds() { return [{ reservationId: "d0a98f51-59de-4cbb-9bdf-9d6bf9c74c3d" }]; },
      async releaseStaleUnattachedRunningManHold(id) { released.push(id); return { result_code: "released" }; },
      async evaluateMinimumEnrollment() { return { result_code: "minimum_met" }; },
    },
    stripe: {
      checkout: { sessions: { async retrieve() { return session(); }, async listLineItems() { return lineItems(); }, async list() { return { data: [], has_more: false }; } } },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  const result = await reconcileRunningManStripeSessions(deps);
  assert.deepEqual(released, ["d0a98f51-59de-4cbb-9bdf-9d6bf9c74c3d"]);
  assert.deepEqual(result, { scanned: 0, reconciled: 1, minimumEvaluated: true });
});

test("does not release a missing hold when an identified session cannot be fully verified", async () => {
  let recoveryListed = false;
  const { deps } = dependencies({
    repository: {
      async applyStripeEventAtomically() { return { result_code: "applied" }; },
      async reconcileRunningManReservation() { return { result_code: "reconciled" }; },
      async listRecoverableRunningManHolds() { recoveryListed = true; return [{ reservationId }]; },
      async releaseMissingRunningManHold() { throw new Error("must not release after incomplete verification"); },
      async evaluateMinimumEnrollment() { return { result_code: "pending" }; },
    },
    stripe: {
      checkout: {
        sessions: {
          async retrieve() { return session(); },
          async listLineItems() { return { data: [], has_more: true }; },
          async list() { return { data: [session()], has_more: false }; },
        },
      },
      paymentIntents: { async retrieve() { return { id: "pi_running_man", metadata: {} }; } },
      charges: { async retrieve() { return { id: "ch_running_man", payment_intent: "pi_running_man", metadata: {}, amount: 19700, amount_refunded: 19700 }; } },
    },
  });

  await assert.rejects(() => reconcileRunningManStripeSessions(deps), RunningManWebhookValidationError);
  assert.equal(recoveryListed, false);
});
