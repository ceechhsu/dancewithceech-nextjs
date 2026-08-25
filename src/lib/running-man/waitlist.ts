export type ParsedRunningManWaitlistInput = {
  name: string;
  email: string;
  marketingConsent: true;
};

export type WaitlistInputResult =
  | { ok: true; value: ParsedRunningManWaitlistInput }
  | { ok: false; code: "invalid_request" | "bot_detected"; message: string };

export type WaitlistRateLimitEntry = {
  count: number;
  resetAt: number;
};

export type WaitlistRateLimitStore = Map<string, WaitlistRateLimitEntry>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;

export function parseRunningManWaitlistInput(input: unknown): WaitlistInputResult {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_request", message: "Please enter your name and email." };
  }

  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const marketingConsent = candidate.marketingConsent === true;
  const website = typeof candidate.website === "string" ? candidate.website.trim() : "";

  if (website) {
    return { ok: false, code: "bot_detected", message: "Unable to submit this request." };
  }

  if (!name || name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email) || !marketingConsent) {
    return {
      ok: false,
      code: "invalid_request",
      message: "Please enter your name, a valid email, and consent to receive Running Man Method updates.",
    };
  }

  return { ok: true, value: { name, email, marketingConsent: true } };
}

export function checkRunningManWaitlistRateLimit(
  store: WaitlistRateLimitStore,
  key: string,
  now = Date.now(),
  limit = 5,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSeconds?: number } {
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { allowed: true };
}

export function getRunningManWaitlistTagId(value = process.env.RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID): number {
  const tagId = Number(value);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    throw new Error("RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID is not configured.");
  }
  return tagId;
}
