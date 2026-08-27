import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStalledCases } from "@/lib/queries/stalled";

/**
 * v5 Stage 11 — the accountability loop. Computed on read rather than via
 * a persisted "alert" row: a case's escalation state is a pure function of
 * (status, statusUpdatedAt, now), so there's nothing to keep in sync.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const stalled = await getStalledCases(session);
  return NextResponse.json({ stalled });
}
