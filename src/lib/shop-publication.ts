export const SHOP_PATH = "/shop";

export function isShopProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production";
}
