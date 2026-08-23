import "server-only";

import Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-08-27.basil" as const;

export class StripeConfigurationError extends Error {
  override name = "StripeConfigurationError";
}

function keyMatchesMode(secretKey: string, expectedLivemode: boolean): boolean {
  const mode = expectedLivemode ? "live" : "test";
  return secretKey.startsWith(`sk_${mode}_`) || secretKey.startsWith(`rk_${mode}_`);
}

/** Creates the server-only Stripe client only when a checkout request needs it. */
export function getStripeClient(expectedLivemode?: boolean): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripeConfigurationError("Stripe checkout is not configured.");
  }
  if (expectedLivemode !== undefined && !keyMatchesMode(secretKey, expectedLivemode)) {
    throw new StripeConfigurationError("Stripe credential mode does not match the Running Man configuration.");
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}
