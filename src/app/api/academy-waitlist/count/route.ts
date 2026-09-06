import { NextResponse } from "next/server";

// Keep existing subscriber records untouched; this offer is no longer available.
export async function GET() {
  return NextResponse.json({ error: "This signup is no longer available." }, { status: 410 });
}
