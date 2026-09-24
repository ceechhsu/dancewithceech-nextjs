import { NextRequest, NextResponse } from "next/server";

import {
  checkRunningManWaitlistRateLimits,
  getRunningManWaitlistTagId,
  parseRunningManWaitlistInput,
  runningManWaitlistNetworkSignal,
  type WaitlistRateLimitStore,
} from "@/lib/running-man/waitlist";
import {
  createRunningManWaitlistRateLimitStore,
  type WaitlistRateLimitRpcClient,
} from "@/lib/running-man/waitlist-rate-limit-store";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const RATE_LIMIT_POLICY = {
  networkLimit: 10,
  networkWindowSeconds: 60,
  emailLimit: 3,
  emailWindowSeconds: 60 * 60,
};

type SystemeContact = { id?: number };

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function contactFields(name: string): Array<{ slug: string; value: string | null }> {
  const [firstName = "", ...rest] = name.trim().split(/\s+/).filter(Boolean);
  if (!firstName) return [];
  return [
    { slug: "first_name", value: firstName },
    { slug: "surname", value: rest.length > 0 ? rest.join(" ") : null },
  ];
}

async function findContact(apiKey: string, email: string): Promise<SystemeContact | null> {
  const response = await fetch(`https://api.systeme.io/api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Systeme contact lookup failed with ${response.status}.`);
  const body = await response.json() as { items?: SystemeContact[] };
  return body.items?.[0] ?? null;
}

async function createContact(apiKey: string, input: { name: string; email: string }): Promise<SystemeContact> {
  const fields = contactFields(input.name);
  const response = await fetch("https://api.systeme.io/api/contacts", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      locale: "en",
      ...(fields.length > 0 ? { fields } : {}),
    }),
    cache: "no-store",
  });

  if (response.status === 201) return await response.json() as SystemeContact;
  if (response.status === 422) {
    const existing = await findContact(apiKey, input.email);
    if (existing) return existing;
    throw new Error("Systeme contact already exists but could not be retrieved.");
  }
  throw new Error(`Systeme contact creation failed with ${response.status}.`);
}

async function addTag(apiKey: string, contactId: number, tagId: number): Promise<void> {
  const response = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ tagId }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 409) throw new Error(`Systeme waitlist tag failed with ${response.status}.`);
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Please enter your name and email." }, 400);
  }

  const parsed = parseRunningManWaitlistInput(input);
  if (!parsed.ok) return json({ error: parsed.message }, parsed.code === "bot_detected" ? 400 : 422);

  const apiKey = process.env.SYSTEME_API_KEY;
  if (!apiKey) return json({ error: "Waitlist is temporarily unavailable." }, 503);

  const networkSignal = runningManWaitlistNetworkSignal(request.headers, process.env.VERCEL === "1");
  if (!networkSignal) return json({ error: "Waitlist is temporarily unavailable." }, 503);

  let rateLimit: Awaited<ReturnType<typeof checkRunningManWaitlistRateLimits>>;
  try {
    const rateLimitStore: WaitlistRateLimitStore = createRunningManWaitlistRateLimitStore(
      supabaseAdmin as unknown as WaitlistRateLimitRpcClient,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );
    rateLimit = await checkRunningManWaitlistRateLimits(rateLimitStore, {
      networkSignal,
      email: parsed.value.email,
      policy: RATE_LIMIT_POLICY,
    });
  } catch (error) {
    console.error("Running Man waitlist rate-limit check failed:", error);
    return json({ error: "Waitlist is temporarily unavailable." }, 503);
  }
  if (!rateLimit.allowed) {
    return json({ error: "Too many attempts. Please try again shortly." }, 429, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  }

  try {
    const tagId = getRunningManWaitlistTagId();
    const contact = await findContact(apiKey, parsed.value.email) ?? await createContact(apiKey, parsed.value);
    if (typeof contact.id !== "number") throw new Error("Systeme did not return a contact ID.");
    await addTag(apiKey, contact.id, tagId);
    return json({ success: true });
  } catch (error) {
    console.error("Running Man waitlist delivery failed:", error);
    return json({ error: "We could not add you to the waitlist. Please try again later." }, 502);
  }
}
