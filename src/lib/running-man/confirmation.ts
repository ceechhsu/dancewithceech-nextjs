import { COHORT } from "./config";
import type { TierIndex } from "./types";

type ConfirmationMetadata = Record<string, string>;

type ConfirmationSession = {
  id: string;
  object: string;
  mode: string | null;
  status: string | null;
  payment_status: string;
  livemode?: boolean;
  amount_total?: number | null;
  metadata: ConfirmationMetadata;
};

type ConfirmationLineItem = {
  id?: string;
  quantity: number | null;
  price: { id: string; currency: string | null; unit_amount: number | null } | null;
};

export type ConfirmationStripeClient = {
  checkout: {
    sessions: {
      retrieve(sessionId: string): Promise<ConfirmationSession>;
      listLineItems(sessionId: string, params: { limit: number; starting_after?: string }): Promise<{
        data: ConfirmationLineItem[];
        has_more: boolean;
      }>;
    };
  };
};

export type RunningManConfirmationResult =
  | {
    kind: "success";
    sessionId: string;
    tierIndex: TierIndex;
    includeCoaching: boolean;
    totalAmountCents: number;
  }
  | { kind: "pending" }
  | { kind: "invalid" };

const RESERVATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trustedMetadata(metadata: ConfirmationMetadata): boolean {
  return Object.keys(metadata).length === 2
    && RESERVATION_ID.test(metadata.running_man_reservation_id ?? "")
    && metadata.running_man_cohort_slug === COHORT.slug;
}

async function allLineItems(client: ConfirmationStripeClient, sessionId: string): Promise<ConfirmationLineItem[]> {
  const items: ConfirmationLineItem[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page += 1) {
    const response = await client.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    items.push(...response.data);
    if (!response.has_more) return items;
    const last = response.data.at(-1)?.id;
    if (!last) throw new Error("Stripe returned an incomplete line-item page.");
    startingAfter = last;
  }
  throw new Error("Stripe returned too many line-item pages.");
}

function tierForPrice(priceId: string, priceIds: Record<TierIndex, string>): TierIndex | null {
  for (const tier of COHORT.tiers) {
    if (priceIds[tier.index] === priceId) return tier.index;
  }
  return null;
}

/**
 * Verifies only what is safe to display after Checkout. Fulfillment remains
 * webhook-driven; visiting this URL never changes enrollment state.
 */
export async function verifyRunningManConfirmationSession(
  client: ConfirmationStripeClient,
  sessionId: string,
  priceIds: Record<TierIndex, string> & { coaching: string },
  expectedLivemode: boolean,
): Promise<RunningManConfirmationResult> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { kind: "invalid" };

  let session: ConfirmationSession;
  try {
    session = await client.checkout.sessions.retrieve(sessionId);
  } catch {
    return { kind: "invalid" };
  }

  if (
    session.id !== sessionId
    || session.object !== "checkout.session"
    || session.mode !== "payment"
    || session.livemode !== expectedLivemode
    || !trustedMetadata(session.metadata)
  ) return { kind: "invalid" };

  if (session.status !== "complete" || session.payment_status !== "paid") {
    return session.status === "open" || session.payment_status === "unpaid"
      ? { kind: "pending" }
      : { kind: "invalid" };
  }

  const amountTotal = session.amount_total;
  if (typeof amountTotal !== "number" || !Number.isInteger(amountTotal) || amountTotal < 0) return { kind: "invalid" };

  let items: ConfirmationLineItem[];
  try {
    items = await allLineItems(client, sessionId);
  } catch {
    return { kind: "invalid" };
  }

  if (items.length < 1 || items.length > 2) return { kind: "invalid" };
  let tierIndex: TierIndex | null = null;
  let includeCoaching = false;
  let totalAmountCents = 0;
  for (const item of items) {
    const unitAmount = item.price?.unit_amount;
    if (item.quantity !== 1 || !item.price || item.price.currency !== "usd" || typeof unitAmount !== "number" || !Number.isInteger(unitAmount)) {
      return { kind: "invalid" };
    }
    totalAmountCents += unitAmount;
    const itemTier = tierForPrice(item.price.id, priceIds);
    if (itemTier) {
      if (tierIndex) return { kind: "invalid" };
      tierIndex = itemTier;
      continue;
    }
    if (item.price.id === priceIds.coaching && !includeCoaching && unitAmount === COHORT.coaching.priceCents) {
      includeCoaching = true;
      continue;
    }
    return { kind: "invalid" };
  }

  if (!tierIndex || totalAmountCents !== amountTotal) return { kind: "invalid" };
  return { kind: "success", sessionId, tierIndex, includeCoaching, totalAmountCents };
}
