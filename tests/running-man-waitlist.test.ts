import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRunningManWaitlistRateLimit,
  parseRunningManWaitlistInput,
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

test("rejects invalid email, missing consent, and honeypot submissions", () => {
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "bad", marketingConsent: true }).ok, false);
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "student@example.com", marketingConsent: false }).ok, false);
  assert.equal(parseRunningManWaitlistInput({ name: "Student", email: "student@example.com", marketingConsent: true, website: "bot" }).ok, false);
});

test("requires a non-empty name and rejects oversized fields", () => {
  assert.equal(parseRunningManWaitlistInput({ name: " ", email: "student@example.com", marketingConsent: true }).ok, false);
  assert.equal(parseRunningManWaitlistInput({ name: "x".repeat(121), email: "student@example.com", marketingConsent: true }).ok, false);
});

test("limits repeated submissions and resets after the window", () => {
  const store: WaitlistRateLimitStore = new Map();
  const key = "ip:student@example.com";

  assert.equal(checkRunningManWaitlistRateLimit(store, key, 1_000, 2, 60_000).allowed, true);
  assert.equal(checkRunningManWaitlistRateLimit(store, key, 2_000, 2, 60_000).allowed, true);
  assert.equal(checkRunningManWaitlistRateLimit(store, key, 3_000, 2, 60_000).allowed, false);
  assert.equal(checkRunningManWaitlistRateLimit(store, key, 61_001, 2, 60_000).allowed, true);
});
