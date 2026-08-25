import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { COHORT } from "./config";
import { createRunningManRepository, type ReservationDecision } from "./repository";
import { CURRENT_TERMS_VERSION } from "./terms";
import type { TierIndex } from "./types";

const ATTEMPT_COOKIE_NAME = "running_man_checkout_attempt";
// One second absorbs Stripe's second-granularity expiry requirement while all
// three artifacts still enforce the same practical 30-minute checkout window.
const ATTEMPT_TTL_SECONDS = 30 * 60 + 1;
const DEFAULT_CHECKOUT_ORIGIN = "https://dancewithceech.com";

type StripeSession = {
  id: string;
  url: string | null;
  status: string | null;
  payment_status: string;
  metadata: Record<string, string>;
  client_reference_id?: string | null;
  payment_intent?: string | null;
};

type StripeCheckoutClient = {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>, options?: Record<string, unknown>): Promise<StripeSession>;
      retrieve(sessionId: string): Promise<StripeSession>;
      expire(sessionId: string): Promise<StripeSession>;
      list(params?: Record<string, unknown>): Promise<{ data: StripeSession[]; has_more: boolean }>;
    };
  };
};

type CheckoutRepository = Pick<ReturnType<typeof createRunningManRepository>,
  "reserveCheckout" | "attachStripeSession" | "replaceUnpaidAttemptSelection" |
  "recoverCreatingReservation" | "reconcileRunningManReservation">;

type CheckoutPriceIds = Record<TierIndex, string> & { coaching: string };

export type RunningManCheckoutRequest = {
  expectedTier: TierIndex;
  includeCoaching: boolean;
  termsVersion: string;
  acknowledged: boolean;
};

export type CheckoutServiceDependencies = {
  repository: CheckoutRepository;
  stripe: StripeCheckoutClient;
  priceIds: CheckoutPriceIds;
  attemptSecret: string;
  now?: () => Date;
  findSessionByAttempt?: (attemptHash: string) => Promise<(StripeSession & { includeCoaching: boolean }) | null>;
};

export type RunningManCheckoutResult =
  | { kind: "checkout"; checkoutUrl: string; setAttemptCookie?: string }
  | { kind: "confirmation"; confirmationUrl: string; setAttemptCookie?: string }
  | { kind: "reconfirm"; enrollmentState: Record<string, unknown>; setAttemptCookie?: string }
  | { kind: "error"; code: "invalid_request" | "closed" | "unavailable"; message: string; setAttemptCookie?: string };

export function runningManCheckoutOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_CHECKOUT_ORIGIN).replace(/\/+$/, "");
}

function validTier(value: unknown): value is TierIndex {
  return value === 1 || value === 2 || value === 3;
}

export function isRunningManCheckoutRequest(value: unknown): value is RunningManCheckoutRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const allowedKeys = ["expectedTier", "includeCoaching", "termsVersion", "acknowledged"];
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) return false;
  return validTier(body.expectedTier)
    && typeof body.includeCoaching === "boolean"
    && typeof body.termsVersion === "string"
    && body.acknowledged === true;
}

/**
 * Vercel rewrites x-forwarded-for at its edge. Outside that known platform,
 * it is attacker-controlled and deliberately excluded from rate-limit input.
 */
export function trustedNetworkSignal(headers: Headers, isTrustedPlatform: boolean): string {
  const forwarded = isTrustedPlatform
    ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unverified-network"
    : "unverified-network";
  return `${forwarded}|${headers.get("user-agent") ?? "unknown-agent"}`;
}

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashCheckoutAttempt(attemptId: string, secret: string): string {
  return hmac(`running-man-attempt:${attemptId}`, secret);
}

function hashNetworkSignal(networkSignal: string, secret: string): string {
  return hmac(`running-man-network:${networkSignal}`, secret);
}

function attemptSignature(attemptId: string, expiresAtSeconds: number, secret: string): string {
  return hmac(`running-man-cookie:${attemptId}:${expiresAtSeconds}`, secret);
}

function encodedAttemptValue(attemptId: string, secret: string, now: Date): string {
  const expiresAtSeconds = Math.floor(now.getTime() / 1000) + ATTEMPT_TTL_SECONDS;
  return `${attemptId}.${expiresAtSeconds}.${attemptSignature(attemptId, expiresAtSeconds, secret)}`;
}

export function createSignedAttemptCookie(attemptId: string, secret: string, now = new Date()): string {
  const value = encodedAttemptValue(attemptId, secret, now);
  return `${ATTEMPT_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/running-man; Max-Age=${ATTEMPT_TTL_SECONDS}`;
}

function cookieValue(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ATTEMPT_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

function verifiedAttemptId(cookieHeader: string | undefined, secret: string, now: Date): string | null {
  const value = cookieValue(cookieHeader);
  if (!value) return null;
  const [attemptId, expiresAt, signature, ...extra] = value.split(".");
  if (!attemptId || !expiresAt || !signature || extra.length > 0 || !/^\d+$/.test(expiresAt)) return null;
  const expected = attemptSignature(attemptId, Number(expiresAt), secret);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  if (Number(expiresAt) <= Math.floor(now.getTime() / 1000)) return null;
  return attemptId;
}

function issueAttempt(secret: string, now: Date): { attemptId: string; setAttemptCookie: string } {
  const attemptId = randomBytes(32).toString("base64url");
  return { attemptId, setAttemptCookie: createSignedAttemptCookie(attemptId, secret, now) };
}

function attemptReference(attemptHash: string, includeCoaching: boolean): string {
  return `running-man:${attemptHash}:${includeCoaching ? "coaching" : "cohort"}`;
}

function selectionFromReference(reference: string | null | undefined, attemptHash: string): boolean | null {
  if (reference === attemptReference(attemptHash, true)) return true;
  if (reference === attemptReference(attemptHash, false)) return false;
  return null;
}

async function findSessionByAttemptFromStripe(
  stripe: StripeCheckoutClient,
  attemptHash: string,
): Promise<(StripeSession & { includeCoaching: boolean }) | null> {
  let startingAfter: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const response = await stripe.checkout.sessions.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    for (const session of response.data) {
      const includeCoaching = selectionFromReference(session.client_reference_id, attemptHash);
      if (includeCoaching !== null) return { ...session, includeCoaching };
    }
    if (!response.has_more || response.data.length === 0) return null;
    startingAfter = response.data[response.data.length - 1].id;
  }
  return null;
}

function checkoutMetadata(reservationId: string): Record<string, string> {
  return {
    running_man_reservation_id: reservationId,
    running_man_cohort_slug: COHORT.slug,
  };
}

function checkoutSessionParams(input: {
  reservationId: string;
  tierIndex: TierIndex;
  baseAmountCents: number;
  includeCoaching: boolean;
  priceIds: CheckoutPriceIds;
  attemptHash: string;
  reservationExpiresAt: string;
  stripeCreatedAt: Date;
}): Record<string, unknown> {
  const metadata = checkoutMetadata(input.reservationId);
  const trustedTier = COHORT.tiers[input.tierIndex - 1];
  if (input.baseAmountCents !== trustedTier.priceCents) {
    throw new RunningManCheckoutConfigurationError("The checkout reservation has an invalid price.");
  }
  const expiresAt = Math.floor(new Date(input.reservationExpiresAt).getTime() / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(input.stripeCreatedAt.getTime() / 1000) + ATTEMPT_TTL_SECONDS) {
    throw new RunningManCheckoutConfigurationError("The checkout reservation is too close to expiry.");
  }
  const lineItems = [{ price: input.priceIds[input.tierIndex], quantity: 1 }];
  if (input.includeCoaching) lineItems.push({ price: input.priceIds.coaching, quantity: 1 });

  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    allow_promotion_codes: false,
    automatic_tax: { enabled: false },
    customer_creation: "always",
    // The installed Stripe types predate name_collection, while the pinned API supports it.
    name_collection: { individual: { enabled: true } },
    client_reference_id: attemptReference(input.attemptHash, input.includeCoaching),
    metadata,
    payment_intent_data: { metadata },
    expires_at: expiresAt,
    success_url: `${runningManCheckoutOrigin()}/running-man-method/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${runningManCheckoutOrigin()}/running-man-method#enroll`,
  };
}

export class RunningManCheckoutConfigurationError extends Error {
  override name = "RunningManCheckoutConfigurationError";
}

function reservationIdFrom(session: StripeSession): string | null {
  const reservationId = session.metadata.running_man_reservation_id;
  return reservationId && reservationId.length > 0 ? reservationId : null;
}

function sessionIsOpenAndUnpaid(session: StripeSession): boolean {
  return session.status === "open" && session.payment_status === "unpaid" && Boolean(session.url);
}

async function reconcileExpiredUnpaidSession(
  repository: CheckoutRepository,
  session: StripeSession,
): Promise<boolean> {
  const reservationId = reservationIdFrom(session);
  if (!reservationId || session.status !== "expired" || session.payment_status !== "unpaid") return false;
  await repository.reconcileRunningManReservation({
    reservationId,
    stripeStatus: "expired",
    paymentStatus: "unpaid",
    sessionId: session.id,
    paymentIntentId: session.payment_intent ?? null,
  });
  return true;
}

async function resolveSelectionChange(
  dependencies: CheckoutServiceDependencies,
  attemptHash: string,
  includeCoaching: boolean,
  networkHash: string,
): Promise<boolean> {
  const findSession = dependencies.findSessionByAttempt ?? ((hash: string) => findSessionByAttemptFromStripe(dependencies.stripe, hash));
  const current = await findSession(attemptHash);
  if (!current || current.includeCoaching === includeCoaching) return false;

  const reservationId = reservationIdFrom(current);
  if (!reservationId) return false;
  if (current.payment_status === "paid") {
    await dependencies.repository.reconcileRunningManReservation({
      reservationId,
      stripeStatus: current.status ?? "complete",
      paymentStatus: "paid",
      sessionId: current.id,
      paymentIntentId: current.payment_intent ?? null,
    });
    return false;
  }

  const expired = current.status === "expired"
    ? current
    : await dependencies.stripe.checkout.sessions.expire(current.id);
  const verified = await dependencies.stripe.checkout.sessions.retrieve(expired.id);
  if (!(await reconcileExpiredUnpaidSession(dependencies.repository, verified))) return false;

  await dependencies.repository.replaceUnpaidAttemptSelection({
    attemptHash,
    networkHash,
    includeCoaching,
  });
  return true;
}

async function attachSessionWithIdempotentRetry(input: {
  repository: CheckoutRepository;
  stripe: StripeCheckoutClient;
  reservationId: string;
  session: StripeSession;
  params: Record<string, unknown>;
}): Promise<void> {
  const verifyOwnership = async (session: StripeSession) => {
    const verified = await input.stripe.checkout.sessions.retrieve(session.id);
    if (reservationIdFrom(verified) !== input.reservationId || verified.metadata.running_man_cohort_slug !== COHORT.slug) {
      throw new Error("Stripe returned a checkout session for another reservation.");
    }
    return verified;
  };

  await verifyOwnership(input.session);
  try {
    await input.repository.attachStripeSession(input.reservationId, input.session.id);
  } catch (error) {
    const retry = await input.stripe.checkout.sessions.create(input.params, { idempotencyKey: input.reservationId });
    const verified = await verifyOwnership(retry);
    if (verified.id !== input.session.id) throw error;
    await input.repository.attachStripeSession(input.reservationId, verified.id);
  }
}

function fromReservation(decision: ReservationDecision): string | null {
  return decision.kind === "reserved" ? decision.reservationId : null;
}

/**
 * Creates hosted Checkout exclusively from an atomic server reservation. Client
 * input can select only an expected public tier and the fixed coaching add-on.
 */
export async function createRunningManCheckout(
  dependencies: CheckoutServiceDependencies,
  input: { request: RunningManCheckoutRequest; attemptCookie?: string; networkSignal: string },
): Promise<RunningManCheckoutResult> {
  const now = dependencies.now?.() ?? new Date();
  const { request } = input;
  if (!request.acknowledged || !validTier(request.expectedTier) || typeof request.includeCoaching !== "boolean") {
    return { kind: "error", code: "invalid_request", message: "Please confirm the enrollment commitments before checkout." };
  }
  if (request.termsVersion !== CURRENT_TERMS_VERSION) {
    return { kind: "reconfirm", enrollmentState: { termsVersion: CURRENT_TERMS_VERSION } };
  }

  const existingAttemptId = verifiedAttemptId(input.attemptCookie, dependencies.attemptSecret, now);
  if (!existingAttemptId && now >= new Date(COHORT.checkoutCutoffIso)) {
    return { kind: "error", code: "closed", message: "Enrollment is closed." };
  }

  const issued = existingAttemptId ? null : issueAttempt(dependencies.attemptSecret, now);
  let attemptId = existingAttemptId ?? issued!.attemptId;
  let setAttemptCookie = issued?.setAttemptCookie;
  let attemptHash = hashCheckoutAttempt(attemptId, dependencies.attemptSecret);
  const networkHash = hashNetworkSignal(input.networkSignal, dependencies.attemptSecret);
  const reserve = () => dependencies.repository.reserveCheckout({
    expectedTier: request.expectedTier,
    includeCoaching: request.includeCoaching,
    termsVersion: request.termsVersion,
    attemptHash,
    networkHash,
  });

  let decision = await reserve();
  if (decision.kind === "terminal") {
    // A paid attempt is complete. Rotate the browser attempt and immediately
    // continue into a fresh checkout so the same browser can enroll another student.
    const nextAttempt = issueAttempt(dependencies.attemptSecret, now);
    attemptId = nextAttempt.attemptId;
    attemptHash = hashCheckoutAttempt(attemptId, dependencies.attemptSecret);
    setAttemptCookie = nextAttempt.setAttemptCookie;
    decision = await reserve();
  }
  if (decision.kind === "reconfirm") {
    const changed = await resolveSelectionChange(dependencies, attemptHash, request.includeCoaching, networkHash);
    if (!changed) return { ...decision, ...(setAttemptCookie ? { setAttemptCookie } : {}) };
    decision = await reserve();
  }
  if (decision.kind === "terminal") {
    const nextAttempt = issueAttempt(dependencies.attemptSecret, now);
    return {
      kind: "confirmation",
      confirmationUrl: `${runningManCheckoutOrigin()}/running-man-method/confirmation?session_id=${encodeURIComponent(decision.sessionId)}`,
      setAttemptCookie: nextAttempt.setAttemptCookie,
    };
  }
  if (decision.kind === "reconfirm") return { ...decision, ...(setAttemptCookie ? { setAttemptCookie } : {}) };

  const reservationId = fromReservation(decision);
  if (!reservationId) {
    return { kind: "error", code: "unavailable", message: "Checkout is temporarily unavailable.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  let params: Record<string, unknown>;
  try {
    params = checkoutSessionParams({
      reservationId,
      tierIndex: decision.tierIndex,
      baseAmountCents: decision.baseAmountCents,
      includeCoaching: decision.includeCoaching,
      priceIds: dependencies.priceIds,
      attemptHash,
      reservationExpiresAt: decision.expiresAt,
      stripeCreatedAt: dependencies.now?.() ?? new Date(),
    });
  } catch {
    await dependencies.repository.recoverCreatingReservation(reservationId);
    return { kind: "error", code: "unavailable", message: "Checkout is temporarily unavailable.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  const findSession = dependencies.findSessionByAttempt ?? ((hash: string) => findSessionByAttemptFromStripe(dependencies.stripe, hash));
  const existingSession = await findSession(attemptHash);
  if (existingSession
    && reservationIdFrom(existingSession) === reservationId
    && existingSession.includeCoaching === decision.includeCoaching
    && sessionIsOpenAndUnpaid(existingSession)) {
    try {
      await attachSessionWithIdempotentRetry({
        repository: dependencies.repository,
        stripe: dependencies.stripe,
        reservationId,
        session: existingSession,
        params,
      });
    } catch {
      return { kind: "error", code: "unavailable", message: "We’re confirming your checkout. Please try again shortly.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
    }
    return { kind: "checkout", checkoutUrl: existingSession.url!, ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  let session: StripeSession;
  try {
    session = await dependencies.stripe.checkout.sessions.create(params, { idempotencyKey: reservationId });
  } catch {
    // An indeterminate Stripe failure leaves the hold untouched. A recovery job
    // must scan Stripe by the server-side attempt reference before any release.
    await dependencies.repository.recoverCreatingReservation(reservationId);
    return { kind: "error", code: "unavailable", message: "We’re confirming your checkout. Please try again shortly.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  if (!session.url) {
    await dependencies.repository.recoverCreatingReservation(reservationId);
    return { kind: "error", code: "unavailable", message: "Checkout is temporarily unavailable.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  try {
    await attachSessionWithIdempotentRetry({
      repository: dependencies.repository,
      stripe: dependencies.stripe,
      reservationId,
      session,
      params,
    });
  } catch {
    return { kind: "error", code: "unavailable", message: "We’re confirming your checkout. Please try again shortly.", ...(setAttemptCookie ? { setAttemptCookie } : {}) };
  }

  return { kind: "checkout", checkoutUrl: session.url, ...(setAttemptCookie ? { setAttemptCookie } : {}) };
}
