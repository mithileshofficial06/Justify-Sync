import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { checkEscalation, type CaseStatus } from "@/lib/engine/escalation";

/**
 * v5 Stage 11 — the accountability loop. Computed on read rather than via
 * a persisted "alert" row: a case's escalation state is a pure function of
 * (status, statusUpdatedAt, now), so there's nothing to keep in sync.
 * A scheduled sweep (see ADR in README) would call this same logic on a
 * timer to push notifications — the detection logic itself lives here
 * either way.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const cases = await db.case.findMany({
    where: { ...districtFilter, caseStatus: { not: "RELEASED" } },
    include: { person: true },
  });

  const stalled = cases
    .map((c) => {
      const result = checkEscalation(
        c.caseStatus.toLowerCase() as CaseStatus,
        c.statusUpdatedAt
      );
      return result.escalate
        ? {
            caseId: c.id,
            personName: c.person.nameVariants[0] ?? "Unknown",
            status: c.caseStatus,
            statusUpdatedAt: c.statusUpdatedAt,
            reason: result.reason,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ stalled });
}
