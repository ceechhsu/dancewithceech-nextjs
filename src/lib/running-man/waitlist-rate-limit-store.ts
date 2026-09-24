import { createHmac } from "node:crypto";

import type {
  WaitlistRateLimitBucket,
  WaitlistRateLimitStore,
} from "./waitlist";

type RateLimitRpcResponse = {
  data: unknown;
  error: { message: string } | null;
};

export type WaitlistRateLimitRpcClient = {
  schema(schema: "private"): {
    rpc(functionName: string, args: Record<string, unknown>): Promise<RateLimitRpcResponse>;
  };
};

function subjectHash(secret: string, bucket: WaitlistRateLimitBucket, subject: string): string {
  return createHmac("sha256", secret)
    .update(`running-man-waitlist:${bucket}:${subject}`)
    .digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createRunningManWaitlistRateLimitStore(
  client: WaitlistRateLimitRpcClient,
  secret: string,
): WaitlistRateLimitStore {
  if (!secret.trim()) throw new Error("Running Man waitlist rate-limit service is unavailable.");

  return {
    async increment({ bucket, subject, limit, windowSeconds }) {
      const { data, error } = await client.schema("private").rpc("check_running_man_waitlist_rate_limit", {
        p_bucket: bucket,
        p_subject_hash: subjectHash(secret, bucket, subject),
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error || !isRecord(data) || typeof data.allowed !== "boolean") {
        throw new Error("Running Man waitlist rate-limit service is unavailable.");
      }

      if (data.allowed) return { allowed: true };
      const retryAfterSeconds = data.retry_after_seconds;
      if (typeof retryAfterSeconds !== "number" || !Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1) {
        throw new Error("Running Man waitlist rate-limit service is unavailable.");
      }
      return { allowed: false, retryAfterSeconds };
    },
  };
}
