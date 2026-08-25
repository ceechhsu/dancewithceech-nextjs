import { timingSafeEqual } from "node:crypto";

import { COHORT } from "./config";
import { createRunningManRepository } from "./repository";
import type { TierIndex } from "./types";

type Metadata = Record<string, string>;

type StripePrice = { id: string; currency: string | null; unit_amount: number | null };
type StripeLineItem = { id?: string; quantity: number | null; price: StripePrice | null };
type StripeSession = {
  id: string;
  object: string;
  mode: string | null;
  status: string | null;
  payment_status: string;
  payment_intent: string | null;
  metadata: Metadata;
  amount_total?: number | null;
  livemode?: boolean;
};
type StripeCharge = {
  id: string;
  payment_intent: string | null;
  metadata: Metadata;
  amount: number;
  amount_refunded: number;
};
type StripePaymentIntent = { id: string; metadata: Metadata };
type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: Record<string, unknown> };
};

type WebhookRepository = Pick<ReturnType<typeof createRunningManRepository>,
  "applyStripeEventAtomically" | "reconcileRunningManReservation" | "evaluateMinimumEnrollment">;
type StripeLookupRepository = {
  findRunningManReservationByStripe?: (input: {
    chargeId?: string | null;
    paymentIntentId?: string | null;
  }) => Promise<{ reservationId: string; sessionId: string | null; paymentIntentId: string | null; chargeId: string | null } | null>;
};
type RecoveryRepository = {
  listRecoverableRunningManHolds?: () => Promise<Array<{ reservationId: string }>>;
  releaseMissingRunningManHold?: (reservationId: string) => Promise<Record<string, unknown>>;
  attachRecoveredRunningManSession?: (input: { reservationId: string; sessionId: string }) => Promise<Record<string, unknown>>;
  listStaleUnattachedRunningManHolds?: () => Promise<Array<{ reservationId: string }>>;
  releaseStaleUnattachedRunningManHold?: (reservationId: string) => Promise<Record<string, unknown>>;
};
type OwnerAlertRepository = {
  claimRunningManOwnerAlert?: (input: { dedupeKey: string; kind: string; payload: Record<string, unknown> }) => Promise<
    { action: "leased"; leaseToken: string } | { action: "sent" } | { action: "leased_by_other" }
  >;
  markRunningManOwnerAlertSent?: (input: { dedupeKey: string; leaseToken: string }) => Promise<void>;
  releaseRunningManOwnerAlertLease?: (input: { dedupeKey: string; leaseToken: string }) => Promise<void>;
};

export type RunningManOwnerAlert =
  | { kind: "refund_review"; eventId: string; partial: boolean }
  | { kind: "minimum_enrollment_under_8"; activePaid: number }
  | { kind: "invalid_stripe_payload"; eventId: string; eventType: string };

export type RunningManWebhookDependencies = {
  priceIds: Record<TierIndex, string> & { coaching: string };
  repository: WebhookRepository & RecoveryRepository & StripeLookupRepository & OwnerAlertRepository;
  expectedLivemode?: boolean;
  notifyOwner?: (alert: RunningManOwnerAlert) => Promise<void>;
  stripe: {
    checkout: {
      sessions: {
        retrieve(sessionId: string): Promise<StripeSession>;
        listLineItems(sessionId: string, params?: { limit: number; starting_after?: string }): Promise<{ data: StripeLineItem[]; has_more: boolean }>;
        list(params?: { limit: number; starting_after?: string; created?: { gte: number } }): Promise<{ data: StripeSession[]; has_more: boolean }>;
      };
    };
    charges: { retrieve(chargeId: string): Promise<StripeCharge> };
    paymentIntents: { retrieve(paymentIntentId: string): Promise<StripePaymentIntent> };
  };
};

export class RunningManWebhookValidationError extends Error {
  override name = "RunningManWebhookValidationError";
  constructor(message: string, readonly retryable = false, readonly identifiedRunningMan = false) {
    super(message);
  }
}

export function hasRunningManCronAuthorization(headers: Headers, secret: string | undefined): boolean {
  if (!secret) return false;
  const provided = headers.get("authorization");
  const expected = `Bearer ${secret}`;
  if (!provided) return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function parseRunningManStripeLivemode(value: string | undefined): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new RunningManWebhookValidationError("RUNNING_MAN_STRIPE_LIVEMODE must be explicitly true or false.");
}

export function assertRunningManOwnerAlertConfiguration(
  livemode: boolean,
  configuration: { apiKey: string | undefined; from: string | undefined; to: string | undefined },
): void {
  if (livemode && (!configuration.apiKey || !configuration.from || !configuration.to)) {
    throw new RunningManWebhookValidationError("Live Running Man payments require configured Resend owner alerts.");
  }
}

const RESERVATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
]);
const MAX_RECONCILIATION_PAGES = 10;
const RECONCILIATION_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;
const OWNER_ALERT_DELIVERY_TIMEOUT_MS = 45_000;

class OwnerAlertDeliveryTimeoutError extends Error {
  override name = "OwnerAlertDeliveryTimeoutError";
}

function deliverOwnerAlert(notify: NonNullable<RunningManWebhookDependencies["notifyOwner"]>, alert: RunningManOwnerAlert): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new OwnerAlertDeliveryTimeoutError("Running Man owner alert delivery timed out.")), OWNER_ALERT_DELIVERY_TIMEOUT_MS);
    Promise.resolve()
      .then(() => notify(alert))
      .then(() => {
        clearTimeout(timeout);
        resolve();
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function requiredReservationId(metadata: Metadata): string {
  const reservationId = metadata.running_man_reservation_id;
  if (
    !RESERVATION_ID.test(reservationId ?? "")
    || metadata.running_man_cohort_slug !== COHORT.slug
    || Object.keys(metadata).length !== 2
  ) {
    throw new RunningManWebhookValidationError("Stripe object does not carry trusted Running Man metadata.", true);
  }
  return reservationId;
}

function priceRules(priceIds: RunningManWebhookDependencies["priceIds"]): Map<string, { amount: number; kind: "tier" | "coaching" }> {
  return new Map([
    [priceIds[1], { amount: COHORT.tiers[0].priceCents, kind: "tier" }],
    [priceIds[2], { amount: COHORT.tiers[1].priceCents, kind: "tier" }],
    [priceIds[3], { amount: COHORT.tiers[2].priceCents, kind: "tier" }],
    [priceIds.coaching, { amount: COHORT.coaching.priceCents, kind: "coaching" }],
  ]);
}

async function allLineItems(dependencies: RunningManWebhookDependencies, sessionId: string): Promise<StripeLineItem[]> {
  const items: StripeLineItem[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page += 1) {
    const response = await dependencies.stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    items.push(...response.data);
    if (!response.has_more) return items;
    const last = response.data.at(-1)?.id;
    if (!last) throw new RunningManWebhookValidationError("Stripe returned an incomplete line-item page.", true);
    startingAfter = last;
  }
  throw new RunningManWebhookValidationError("Stripe returned too many checkout line-item pages.", true);
}

async function verifiedRunningManSession(
  dependencies: RunningManWebhookDependencies,
  sessionId: string,
): Promise<{ session: StripeSession; reservationId: string }> {
  const session = await dependencies.stripe.checkout.sessions.retrieve(sessionId);
  if (session.object !== "checkout.session") {
    throw new RunningManWebhookValidationError("Stripe checkout is not a payment session.", true);
  }
  const reservationId = requiredReservationId(session.metadata);
  if (session.mode !== "payment") {
    throw new RunningManWebhookValidationError("Stripe checkout is not a payment session.", true, true);
  }
  if (dependencies.expectedLivemode !== undefined && session.livemode !== dependencies.expectedLivemode) {
    throw new RunningManWebhookValidationError("Stripe checkout mode does not match this deployment.", true, true);
  }
  const rules = priceRules(dependencies.priceIds);
  let tierCount = 0;
  let coachingCount = 0;
  let lineItems: StripeLineItem[];
  try {
    lineItems = await allLineItems(dependencies, session.id);
  } catch (error) {
    if (error instanceof RunningManWebhookValidationError) {
      throw new RunningManWebhookValidationError(error.message, error.retryable, true);
    }
    throw error;
  }
  for (const item of lineItems) {
    const price = item.price;
    const rule = price ? rules.get(price.id) : undefined;
    if (!price || !rule || item.quantity !== 1 || price.currency !== "usd" || price.unit_amount !== rule.amount) {
      throw new RunningManWebhookValidationError("Stripe checkout line items do not match the configured cohort price allowlist.", true, true);
    }
    if (rule.kind === "tier") tierCount += 1;
    else coachingCount += 1;
  }
  if (tierCount !== 1 || coachingCount > 1) {
    throw new RunningManWebhookValidationError("Stripe checkout has an invalid Running Man line-item combination.", true, true);
  }
  return { session, reservationId };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function verifiedCharge(
  dependencies: RunningManWebhookDependencies,
  chargeId: string,
  eventPaymentIntentId: string | null,
): Promise<{ charge: StripeCharge; sessionId: string | null; paymentIntentId: string }> {
  const persisted = dependencies.repository.findRunningManReservationByStripe
    ? await dependencies.repository.findRunningManReservationByStripe({ chargeId, paymentIntentId: eventPaymentIntentId })
    : null;
  const charge = await dependencies.stripe.charges.retrieve(chargeId);
  const paymentIntentId = persisted?.paymentIntentId ?? charge.payment_intent ?? eventPaymentIntentId;
  if (!paymentIntentId) {
    throw new RunningManWebhookValidationError("Stripe charge has no PaymentIntent to verify.", true);
  }
  if (persisted) {
    return { charge, sessionId: persisted.sessionId, paymentIntentId };
  }
  // Charges created by Checkout inherit the reservation identity from the
  // PaymentIntent. We do not trust webhook object metadata as a fallback.
  const paymentIntent = await dependencies.stripe.paymentIntents.retrieve(paymentIntentId);
  requiredReservationId(paymentIntent.metadata);
  return { charge, sessionId: null, paymentIntentId };
}

function eventPayload(input: { id: string; paymentStatus?: string; amountTotal?: number | null; amount?: number; amountRefunded?: number }) {
  return {
    amount_total: input.amountTotal ?? undefined,
    amount_refunded: input.amountRefunded,
    id: input.id,
    payment_status: input.paymentStatus,
    ...(input.amount === undefined ? {} : { amount: input.amount }),
  };
}

function validateMode(dependencies: RunningManWebhookDependencies, event: StripeEvent): void {
  if (dependencies.expectedLivemode !== undefined && event.livemode !== dependencies.expectedLivemode) {
    throw new RunningManWebhookValidationError("Stripe event mode does not match this deployment.");
  }
}

function ownerAlertKey(alert: RunningManOwnerAlert): string {
  if (alert.kind === "minimum_enrollment_under_8") return `minimum:${COHORT.slug}`;
  if (alert.kind === "refund_review") return `refund:${alert.eventId}`;
  return `invalid:${alert.eventId}`;
}

export async function notifyRunningManOwner(dependencies: RunningManWebhookDependencies, alert: RunningManOwnerAlert): Promise<void> {
  if (!dependencies.notifyOwner) return;
  const dedupeKey = ownerAlertKey(alert);
  if (dependencies.repository.claimRunningManOwnerAlert) {
    const claim = await dependencies.repository.claimRunningManOwnerAlert({
      dedupeKey,
      kind: alert.kind,
      payload: alert as Record<string, unknown>,
    });
    if (claim.action === "sent" || claim.action === "leased_by_other") return;
    try {
      await deliverOwnerAlert(dependencies.notifyOwner, alert);
      await dependencies.repository.markRunningManOwnerAlertSent?.({ dedupeKey, leaseToken: claim.leaseToken });
    } catch (error) {
      // A timed-out request may still be in flight until this function's
      // 60-second max duration ends. Keep the lease until its expiry so no
      // retry can start a concurrent delivery; explicit provider failures are
      // released immediately for retry.
      if (!(error instanceof OwnerAlertDeliveryTimeoutError)) {
        await dependencies.repository.releaseRunningManOwnerAlertLease?.({ dedupeKey, leaseToken: claim.leaseToken });
      }
      throw error;
    }
    return;
  }
  await dependencies.notifyOwner(alert);
}

export async function finalizeRunningManStripeEvent(
  dependencies: RunningManWebhookDependencies,
  event: StripeEvent,
): Promise<{ kind: "applied" | "audit_only" | "ignored" }> {
  if (!SUPPORTED_EVENT_TYPES.has(event.type)) return { kind: "ignored" };
  if (dependencies.expectedLivemode !== undefined && event.livemode !== dependencies.expectedLivemode) return { kind: "ignored" };
  try {
    return await finalizeSupportedRunningManStripeEvent(dependencies, event);
  } catch (error) {
    // Checkout sessions expose their own metadata, so an unmarked one is
    // conclusively another product. Charge/dispute objects often do not carry
    // that metadata; those remain retryable until their PaymentIntent or the
    // persisted Stripe identifiers can resolve them safely.
    if (error instanceof RunningManWebhookValidationError && !error.identifiedRunningMan && event.type.startsWith("checkout.session.")) {
      return { kind: "ignored" };
    }
    throw error;
  }
}

async function finalizeSupportedRunningManStripeEvent(
  dependencies: RunningManWebhookDependencies,
  event: StripeEvent,
): Promise<{ kind: "applied" | "audit_only" | "ignored" }> {
  validateMode(dependencies, event);

  if (event.type.startsWith("checkout.session.")) {
    const sessionId = asString(event.data.object.id);
    if (!sessionId) throw new RunningManWebhookValidationError("Stripe checkout event has no session ID.", true);
    const { session } = await verifiedRunningManSession(dependencies, sessionId);
    if (event.type === "checkout.session.expired") {
      if (session.status !== "expired" || session.payment_status !== "unpaid") {
        throw new RunningManWebhookValidationError("Stripe session expiry is not verified as expired and unpaid.", true, true);
      }
    } else if (session.status !== "complete" || session.payment_status !== "paid") {
      throw new RunningManWebhookValidationError("Stripe checkout completion is not verified as paid.", true, true);
    }
    await dependencies.repository.applyStripeEventAtomically({
      eventId: event.id,
      eventType: event.type,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      chargeId: null,
      payload: eventPayload({ id: session.id, paymentStatus: session.payment_status, amountTotal: session.amount_total }),
    });
    return { kind: "applied" };
  }

  const eventChargeId = event.type === "charge.refunded"
    ? asString(event.data.object.id)
    : asString(event.data.object.charge);
  if (!eventChargeId) throw new RunningManWebhookValidationError("Stripe charge event has no charge ID.", true);
  const { charge, paymentIntentId, sessionId } = await verifiedCharge(
    dependencies,
    eventChargeId,
    asString(event.data.object.payment_intent),
  );
  const isPartialRefund = event.type === "charge.refunded" && charge.amount_refunded !== charge.amount;
  await dependencies.repository.applyStripeEventAtomically({
    eventId: event.id,
    eventType: event.type,
    sessionId,
    paymentIntentId,
    chargeId: charge.id,
    payload: eventPayload({ id: charge.id, amount: charge.amount, amountRefunded: charge.amount_refunded }),
  });
  if (event.type === "charge.refunded") {
    await notifyRunningManOwner(dependencies, { kind: "refund_review", eventId: event.id, partial: isPartialRefund });
  }
  return { kind: isPartialRefund ? "audit_only" : "applied" };
}

/**
 * Stripe is the authority for terminal checkout status. This scan intentionally
 * leaves missing and open sessions alone: a list outage or an incomplete scan
 * must never free inventory. Known expired+unpaid sessions are retrieved again
 * before their database hold can be released.
 */
export async function reconcileRunningManStripeSessions(
  dependencies: RunningManWebhookDependencies,
): Promise<{ scanned: number; reconciled: number; minimumEvaluated: boolean }> {
  let scanned = 0;
  let reconciled = 0;
  let startingAfter: string | undefined;
  let unsettled = false;
  const observedReservationIds = new Set<string>();
  let completedScan = false;
  const reconcileAfter = Math.floor(Date.now() / 1000) - RECONCILIATION_LOOKBACK_SECONDS;
  for (let page = 0; page < MAX_RECONCILIATION_PAGES; page += 1) {
    const response = await dependencies.stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: reconcileAfter },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const listed of response.data) {
      let verified: { session: StripeSession; reservationId: string };
      try {
        verified = await verifiedRunningManSession(dependencies, listed.id);
      } catch (error) {
        if (error instanceof RunningManWebhookValidationError && !error.identifiedRunningMan) continue;
        throw error;
      }
      scanned += 1;
      const { session, reservationId } = verified;
      observedReservationIds.add(reservationId);
      if (session.status === "complete" && session.payment_status === "paid") {
        await dependencies.repository.reconcileRunningManReservation({
          reservationId,
          stripeStatus: session.status,
          paymentStatus: session.payment_status,
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        });
        reconciled += 1;
      } else if (session.status === "expired" && session.payment_status === "unpaid") {
        // `verifiedRunningManSession` is a fresh retrieve, not the list item.
        await dependencies.repository.reconcileRunningManReservation({
          reservationId,
          stripeStatus: "expired",
          paymentStatus: "unpaid",
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        });
        reconciled += 1;
      } else {
        await dependencies.repository.attachRecoveredRunningManSession?.({
          reservationId,
          sessionId: session.id,
        });
        reconciled += 1;
        unsettled = true;
      }
    }
    if (!response.has_more) {
      completedScan = true;
      break;
    }
    const last = response.data.at(-1)?.id;
    if (!last) throw new RunningManWebhookValidationError("Stripe returned an incomplete checkout-session page.", true);
    startingAfter = last;
  }
  if (!completedScan) {
    throw new RunningManWebhookValidationError("Stripe returned too many checkout-session pages.", true);
  }
  if (dependencies.repository.listRecoverableRunningManHolds && dependencies.repository.releaseMissingRunningManHold) {
    const candidates = await dependencies.repository.listRecoverableRunningManHolds();
    for (const candidate of candidates) {
      if (!observedReservationIds.has(candidate.reservationId)) {
        await dependencies.repository.releaseMissingRunningManHold(candidate.reservationId);
        reconciled += 1;
      }
    }
  }
  if (dependencies.repository.listStaleUnattachedRunningManHolds && dependencies.repository.releaseStaleUnattachedRunningManHold) {
    for (const candidate of await dependencies.repository.listStaleUnattachedRunningManHolds()) {
      await dependencies.repository.releaseStaleUnattachedRunningManHold(candidate.reservationId);
      reconciled += 1;
    }
  }
  if (unsettled) return { scanned, reconciled, minimumEvaluated: false };
  const minimum = await dependencies.repository.evaluateMinimumEnrollment();
  if (minimum.result_code === "owner_notification_required" && typeof minimum.activePaid === "number" && minimum.activePaid < 8) {
    await notifyRunningManOwner(dependencies, { kind: "minimum_enrollment_under_8", activePaid: minimum.activePaid });
  }
  return { scanned, reconciled, minimumEvaluated: true };
}
