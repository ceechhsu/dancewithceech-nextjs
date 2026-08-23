import { NextResponse } from "next/server";

import { createRunningManRepository, type RunningManRpcClient } from "@/lib/running-man/repository";
import { deriveEnrollmentState, type EnrollmentAggregate } from "@/lib/running-man/state";
import type { EnrollmentState, EnrollmentStateResponse } from "@/lib/running-man/types";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const CACHE_CONTROL = "private, max-age=0, s-maxage=15, stale-while-revalidate=0";
let safeSnapshot: EnrollmentState | null = null;

function asAggregate(value: Record<string, unknown>): EnrollmentAggregate {
  const now = value.now;
  if (typeof now !== "string" && !(now instanceof Date)) {
    throw new Error("Enrollment availability did not include a timestamp.");
  }

  return {
    now: now instanceof Date ? now : new Date(now),
    activePaidStudents: value.activePaidStudents as number,
    capacityConsumed: value.capacityConsumed as number,
    tiers: value.tiers as EnrollmentAggregate["tiers"],
    coaching: value.coaching as EnrollmentAggregate["coaching"],
    hasOpenPreDeadlineSession: value.hasOpenPreDeadlineSession as boolean,
  };
}

function response(body: EnrollmentStateResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

export async function GET() {
  const asOf = new Date().toISOString();

  try {
    const repository = createRunningManRepository(supabaseAdmin as unknown as RunningManRpcClient);
    const aggregate = await repository.getEnrollmentAggregate();
    const state = deriveEnrollmentState(asAggregate(aggregate));
    safeSnapshot = state;
    return response({ kind: "available", state, asOf });
  } catch {
    if (safeSnapshot) return response({ kind: "available", state: safeSnapshot, asOf });
    return response({
      kind: "unavailable",
      asOf,
      message: "Enrollment availability is being checked. Please refresh in a moment.",
    }, 503);
  }
}
