export type ParsedRunningManWaitlistInput = {
  name: string;
  email: string;
  marketingConsent: true;
};

export type WaitlistInputResult =
  | { ok: true; value: ParsedRunningManWaitlistInput }
  | { ok: false; code: "invalid_request" | "bot_detected"; message: string };

export type WaitlistRateLimitBucket = "network" | "email";

export type WaitlistRateLimitRequest = {
  bucket: WaitlistRateLimitBucket;
  subject: string;
  limit: number;
  windowSeconds: number;
  now: number;
};

export type WaitlistRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export type WaitlistRateLimitStore = {
  increment(input: WaitlistRateLimitRequest): Promise<WaitlistRateLimitDecision>;
};

export type WaitlistRateLimitPolicy = {
  networkLimit: number;
  networkWindowSeconds: number;
  emailLimit: number;
  emailWindowSeconds: number;
};

const DEFAULT_RATE_LIMIT_POLICY: WaitlistRateLimitPolicy = {
  networkLimit: 10,
  networkWindowSeconds: 60,
  emailLimit: 3,
  emailWindowSeconds: 60 * 60,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;

export function parseRunningManWaitlistInput(input: unknown): WaitlistInputResult {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_request", message: "Please enter your name and email." };
  }

  const candidate = input as Record<string, unknown>;
  if (candidate.name !== undefined && typeof candidate.name !== "string") {
    return { ok: false, code: "invalid_request", message: "Please enter a valid email and consent to receive Running Man class updates." };
  }

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const marketingConsent = candidate.marketingConsent === true;
  const website = typeof candidate.website === "string" ? candidate.website.trim() : "";

  if (website) {
    return { ok: false, code: "bot_detected", message: "Unable to submit this request." };
  }

  if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email) || !marketingConsent) {
    return {
      ok: false,
      code: "invalid_request",
      message: "Please enter a valid email and consent to receive Running Man class updates.",
    };
  }

  return { ok: true, value: { name, email, marketingConsent: true } };
}

export async function checkRunningManWaitlistRateLimits(
  store: WaitlistRateLimitStore,
  input: { networkSignal: string; email: string; now?: number; policy?: WaitlistRateLimitPolicy },
): Promise<WaitlistRateLimitDecision> {
  const now = input.now ?? Date.now();
  const policy = input.policy ?? DEFAULT_RATE_LIMIT_POLICY;
  const network = await store.increment({
    bucket: "network",
    subject: input.networkSignal,
    limit: policy.networkLimit,
    windowSeconds: policy.networkWindowSeconds,
    now,
  });
  if (!network.allowed) return network;

  return store.increment({
    bucket: "email",
    subject: input.email,
    limit: policy.emailLimit,
    windowSeconds: policy.emailWindowSeconds,
    now,
  });
}

export function runningManWaitlistNetworkSignal(headers: Headers, isTrustedPlatform: boolean): string | null {
  if (!isTrustedPlatform) return "local-development";
  return headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || null;
}

export function getRunningManWaitlistTagId(value = process.env.RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID): number {
  const tagId = Number(value);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    throw new Error("RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID is not configured.");
  }
  return tagId;
}
