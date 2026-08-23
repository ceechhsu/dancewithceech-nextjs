export const COHORT = Object.freeze({
  slug: "running-man-method-fall-2026",
  seats: 12,
  checkoutCutoffIso: "2026-09-18T06:59:00.000Z",
  tiers: Object.freeze([
    Object.freeze({
      index: 1,
      ceiling: 3,
      priceCents: 19700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_197",
    }),
    Object.freeze({
      index: 2,
      ceiling: 6,
      priceCents: 24700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_247",
    }),
    Object.freeze({
      index: 3,
      ceiling: 12,
      priceCents: 29700,
      priceEnv: "RUNNING_MAN_STRIPE_PRICE_297",
    }),
  ]),
  coaching: Object.freeze({
    seats: 3,
    priceCents: 10000,
    priceEnv: "RUNNING_MAN_STRIPE_PRICE_COACHING",
  }),
} as const);
