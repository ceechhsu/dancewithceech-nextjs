import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createRunningManWaitlistRateLimitStore } from "../src/lib/running-man/waitlist-rate-limit-store";

test("uses a private RPC and stores only a keyed subject fingerprint", async () => {
  const calls: Array<{ schema: string; functionName: string; args: Record<string, unknown> }> = [];
  const client = {
    schema(schema: string) {
      return {
        async rpc(functionName: string, args: Record<string, unknown>) {
          calls.push({ schema, functionName, args });
          return { data: { allowed: false, retry_after_seconds: 38 }, error: null };
        },
      };
    },
  };
  const store = createRunningManWaitlistRateLimitStore(client, "server-only-rate-limit-secret");

  const result = await store.increment({
    bucket: "email",
    subject: "student@example.com",
    limit: 3,
    windowSeconds: 3_600,
    now: 1_000,
  });

  const subjectHash = createHmac("sha256", "server-only-rate-limit-secret")
    .update("running-man-waitlist:email:student@example.com")
    .digest("hex");
  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 38 });
  assert.deepEqual(calls, [{
    schema: "private",
    functionName: "check_running_man_waitlist_rate_limit",
    args: {
      p_bucket: "email",
      p_subject_hash: subjectHash,
      p_limit: 3,
      p_window_seconds: 3_600,
    },
  }]);
  assert.equal(JSON.stringify(calls).includes("student@example.com"), false);
});

test("fails closed when the shared rate-limit service is unavailable", async () => {
  const store = createRunningManWaitlistRateLimitStore({
    schema() {
      return {
        async rpc() {
          return { data: null, error: { message: "database unavailable" } };
        },
      };
    },
  }, "server-only-rate-limit-secret");

  await assert.rejects(() => store.increment({
    bucket: "network",
    subject: "203.0.113.5",
    limit: 10,
    windowSeconds: 60,
    now: 1_000,
  }), /rate-limit service is unavailable/i);
});
