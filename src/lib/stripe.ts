import "server-only";

import Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-08-27.basil" as const;

export class StripeConfigurationError extends Error {
  override name = "StripeConfigurationError";
}

/** Creates the server-only Stripe client only when a checkout request needs it. */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripeConfigurationError("Stripe checkout is not configured.");
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}
