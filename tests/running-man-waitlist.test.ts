import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRunningManWaitlistRateLimits,
  parseRunningManWaitlistInput,
  runningManWaitlistNetworkSignal,
  type WaitlistRateLimitStore,
} from "../src/lib/running-man/waitlist";

test("normalizes a valid waitlist submission", () => {
  const result = parseRunningManWaitlistInput({
    name: "  Ceech Student  ",
    email: "  STUDENT@Example.COM ",
    marketingConsent: true,
    website: "",
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      name: "Ceech Student",
      email: "student@example.com",
      marketingConsent: true,
    },
  });
});

test("accepts email and explicit class updates consent when the first name is omitted", () => {
  const result = parseRunningManWaitlistInput({
    email: "  STUDENT@Example.COM ",
    marketingConsent: true,
    website: "",
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      name: "",
      email: "student@example.com",
      marketingConsent: true,
    },
  });
});

test("rejects invalid email, missing consent, and honeypot submissions", () => {
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "bad", marketingConsent: true }).ok, false);
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "student@example.com", marketingConsent: false }).ok, false);
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "student@example.com", marketingConsent: true, website: "bot" }).ok, false);
});

test("allows a blank name and rejects an oversized name", () => {
  assert.equal(parseRunningManWaitlistInput({ name: " ", email: "student@example.com", marketingConsent: true }).ok, true);
  assert.equal(parseRunningManWaitlistInput({ name: "x".repeat(121), email: "student@example.com", marketingConsent: true }).ok, false);
});

function createFakeRateLimitStore() {
  const counts = new Map<string, number>();
  const store: WaitlistRateLimitStore = {
    async increment({ bucket, subject, limit }) {
      const key = `${bucket}:${subject}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { allowed: count <= limit, retryAfterSeconds: 60 };
    },
  };
  return { store, counts };
}

test("limits a network across submissions with different email addresses", async () => {
  const { store, counts } = createFakeRateLimitStore();
  const policy = { networkLimit: 2, networkWindowSeconds: 60, emailLimit: 100, emailWindowSeconds: 3_600 };

  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.5", email: "one@example.com", now: 1_000, policy })).allowed, true);
  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.5", email: "two@example.com", now: 2_000, policy })).allowed, true);
  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.5", email: "three@example.com", now: 3_000, policy })).allowed, false);
  assert.equal(counts.get("network:203.0.113.5"), 3);
});

test("limits one email across submissions from different networks", async () => {
  const { store, counts } = createFakeRateLimitStore();
  const policy = { networkLimit: 100, networkWindowSeconds: 60, emailLimit: 2, emailWindowSeconds: 3_600 };

  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.5", email: "same@example.com", now: 1_000, policy })).allowed, true);
  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.6", email: "same@example.com", now: 2_000, policy })).allowed, true);
  assert.equal((await checkRunningManWaitlistRateLimits(store, { networkSignal: "203.0.113.7", email: "same@example.com", now: 3_000, policy })).allowed, false);
  assert.equal(counts.get("email:same@example.com"), 3);
});

test("uses only the trusted platform network address in production", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.2", "x-real-ip": "198.51.100.9" });

  assert.equal(runningManWaitlistNetworkSignal(headers, true), "203.0.113.5");
  assert.equal(runningManWaitlistNetworkSignal(new Headers({ "x-real-ip": "198.51.100.9" }), true), null);
  assert.equal(runningManWaitlistNetworkSignal(headers, false), "local-development");
});
