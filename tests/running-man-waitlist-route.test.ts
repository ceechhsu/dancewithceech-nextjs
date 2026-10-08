import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { NextRequest } from "next/server";
import ts from "typescript";

const requireModule = createRequire(import.meta.url);
const email = "student+running@example.com";
type Call = { url: URL; init: RequestInit };
type Reply = { status: number; body?: unknown };

// Load the unchanged route with isolated process state and transport doubles.
// No real credentials, database, Systeme requests, or listener are used.
function harness(replies: Reply[], allowed = true) {
  const calls: Call[] = [];
  const errors: unknown[][] = [];
  const exports: { POST?: (request: NextRequest) => Promise<Response> } = {};
  const source = readFileSync(new URL("../src/app/api/running-man-waitlist/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, {
    exports,
    process: { env: { SYSTEME_API_KEY: "offline-api-key", VERCEL: "1" } },
    console: { error: (...args: unknown[]) => errors.push(args) },
    require(id: string) {
      if (id === "@/lib/supabase-admin") {
        return { supabaseAdmin: { schema: () => ({
          rpc: async () => ({ data: { allowed, retry_after_seconds: 60 }, error: null }),
        }) } };
      }
      if (id === "@/lib/supabase-server-key") {
        return { getSupabaseServerKey: () => "offline-rate-limit-secret" };
      }
      if (id === "@/lib/running-man/waitlist") {
        const waitlist = requireModule("../src/lib/running-man/waitlist");
        return { ...waitlist, getRunningManWaitlistTagId: () => waitlist.getRunningManWaitlistTagId("1515684") };
      }
      if (id.startsWith("@/")) return requireModule("../src/" + id.slice(2));
      return requireModule(id);
    },
    async fetch(input: string, init: RequestInit = {}) {
      const url = new URL(input);
      assert.equal(url.origin, "https://api.systeme.io");
      assert.equal(new Headers(init.headers).get("X-API-Key"), "offline-api-key");
      assert.equal(init.cache, "no-store");
      calls.push({ url, init });
      if ((init.method ?? "GET") === "GET") {
        assert.equal(url.pathname, "/api/contacts");
        assert.equal(url.searchParams.get("email"), email);
        assert.deepEqual([...url.searchParams.keys()], ["email", "limit"]);
        // Model the documented API contract rather than accepting any query.
        const limit = Number(url.searchParams.get("limit"));
        if (limit < 10 || limit > 100) return Response.json({ error: "Invalid limit" }, { status: 422 });
        assert.equal(limit, 10);
      }
      if (url.pathname === "/api/contacts" && init.method === "POST") {
        const body = JSON.parse(init.body as string) as { fields?: Array<{ value: unknown }> };
        // The live provider rejects blank field values, including null surnames.
        if (body.fields?.some(({ value }) => typeof value !== "string" || !value.trim())) {
          return Response.json({ violations: [{ propertyPath: "fields[1].value",
            code: "c1051bb4-d103-4f74-8988-acbcafc7fdc3" }] }, { status: 422 });
        }
      }
      const reply = replies.shift();
      assert.ok(reply, "Unexpected external request");
      return reply.status === 204 ? new Response(null, { status: 204 }) :
        Response.json(reply.body ?? {}, { status: reply.status });
    },
  });
  return {
    calls, errors,
    async submit(overrides: Record<string, unknown> = {}) {
      const response = await exports.POST!(new NextRequest("https://offline.example/api/running-man-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.5" },
        body: JSON.stringify({ name: "Student Dancer", email: "  STUDENT+running@Example.COM ", marketingConsent: true, website: "", ...overrides }),
      }));
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      return response;
    },
    assertComplete() { assert.equal(replies.length, 0); },
  };
}

test("new subscriber passes contact lookup, creation, and tagging", async () => {
  const h = harness([{ status: 200, body: { items: [] } }, { status: 201, body: { id: 101 } }, { status: 204 }]);
  const response = await h.submit();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[1].init.method, "POST");
  assert.deepEqual(JSON.parse(h.calls[1].init.body as string), {
    email, locale: "en", fields: [{ slug: "first_name", value: "Student" }, { slug: "surname", value: "Dancer" }],
  });
  assert.equal(h.calls[2].url.pathname, "/api/contacts/101/tags");
  assert.equal(h.calls[2].init.method, "POST");
  assert.deepEqual(JSON.parse(h.calls[2].init.body as string), { tagId: 1515684 });
  assert.equal(h.errors.length, 0);
  h.assertComplete();
});

test("existing subscriber is tagged without creating a duplicate", async () => {
  const h = harness([{ status: 200, body: { items: [{ id: 102 }] } }, { status: 204 }]);
  assert.equal((await h.submit()).status, 200);
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].url.pathname, "/api/contacts/102/tags");
  h.assertComplete();
});

test("first-name-only signup omits surname and completes creation and tagging", async () => {
  const h = harness([{ status: 200, body: { items: [] } }, { status: 201, body: { id: 105 } }, { status: 204 }]);
  assert.equal((await h.submit({ name: "  Student  " })).status, 200);
  assert.deepEqual(JSON.parse(h.calls[1].init.body as string), {
    email, locale: "en", fields: [{ slug: "first_name", value: "Student" }],
  });
  assert.equal(h.calls[2].url.pathname, "/api/contacts/105/tags");
  assert.equal(h.errors.length, 0);
  h.assertComplete();
});

test("signup without an optional name omits fields and completes creation and tagging", async () => {
  const h = harness([{ status: 200, body: { items: [] } }, { status: 201, body: { id: 106 } }, { status: 204 }]);
  assert.equal((await h.submit({ name: "" })).status, 200);
  assert.deepEqual(JSON.parse(h.calls[1].init.body as string), { email, locale: "en" });
  assert.equal(h.calls[2].url.pathname, "/api/contacts/106/tags");
  assert.equal(h.errors.length, 0);
  h.assertComplete();
});

test("creation conflict retries the exact email lookup with a valid limit", async () => {
  const h = harness([{ status: 200, body: { items: [] } }, { status: 422 },
    { status: 200, body: { items: [{ id: 103 }] } }, { status: 204 }]);
  assert.equal((await h.submit()).status, 200);
  assert.equal(h.calls.length, 4);
  assert.equal(h.calls[2].url.href, h.calls[0].url.href);
  assert.equal(h.calls[3].url.pathname, "/api/contacts/103/tags");
  h.assertComplete();
});

test("an already applied tag remains a successful signup", async () => {
  const h = harness([{ status: 200, body: { items: [{ id: 104 }] } }, { status: 409 }]);
  assert.equal((await h.submit()).status, 200);
  h.assertComplete();
});

test("upstream lookup failure returns 502 without creating or tagging", async () => {
  const h = harness([{ status: 500 }]);
  assert.equal((await h.submit()).status, 502);
  assert.equal(h.calls.length, 1);
  assert.equal(h.errors.length, 1);
  h.assertComplete();
});

test("missing consent stops before external requests", async () => {
  const h = harness([]);
  assert.equal((await h.submit({ marketingConsent: false })).status, 422);
  assert.equal(h.calls.length, 0);
  h.assertComplete();
});

test("rate limiting stops before external requests", async () => {
  const h = harness([], false);
  const response = await h.submit();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(h.calls.length, 0);
  h.assertComplete();
});

test("creation validation failure reports safe fields and codes, not a presumed duplicate", async () => {
  const secretDetail = "student+running@example.com was rejected: private provider detail";
  const h = harness([{ status: 200, body: { items: [] } }, { status: 422, body: {
    detail: secretDetail, violations: [
      { propertyPath: "email", code: "bd79c0ab-ddba-46cc-a703-a7a4b08de310", message: secretDetail },
      { propertyPath: secretDetail, code: secretDetail, message: secretDetail },
    ],
  } }, { status: 200, body: { items: [] } }]);
  assert.equal((await h.submit()).status, 502);
  assert.equal(h.calls.length, 3);
  const error = h.errors[0][1] as Error;
  assert.match(error.message, /creation failed with 422; retry lookup returned no contact/);
  assert.match(error.message, /Validation fields: email, other/);
  assert.match(error.message, /bd79c0ab-ddba-46cc-a703-a7a4b08de310, unknown/);
  assert.equal(error.message.includes(secretDetail), false);
  assert.equal(error.message.includes(email), false);
  assert.equal(error.message.includes("already exists"), false);
  h.assertComplete();
});

test("creation rejection without structured details keeps its original failure visible", async () => {
  const h = harness([{ status: 200, body: { items: [] } }, { status: 422 },
    { status: 200, body: { items: [] } }]);
  assert.equal((await h.submit()).status, 502);
  assert.match((h.errors[0][1] as Error).message, /No structured validation details/);
  h.assertComplete();
});
