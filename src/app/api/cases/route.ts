import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { rankCases } from "@/lib/engine/rank";
import { logAudit } from "@/lib/audit";

/**
 * v5 Stage 9 — the ranked list, scoped to the authenticated lawyer's own
 * district (v5 §5.4: "cannot see other districts"). Tier 1 above Tier 2,
 * most overdue first; Track B flags delivered alongside via the same call.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "LAWYER" && session.role !== "DISTRICT_ADMIN" && session.role !== "STATE_ADMIN") {
    return NextResponse.json({ error: "Not authorized to view cases." }, { status: 403 });
  }

  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const [trackACases, trackBFlags] = await Promise.all([
    db.case.findMany({
      where: {
        ...districtFilter,
        formulaResult: { tier: { not: null } },
      },
      include: {
        person: true,
        formulaResult: { include: { governingSection: true } },
      },
    }),
    db.trackBFlag.findMany({
      where: { case: districtFilter },
      include: { case: { include: { person: true } } },
    }),
  ]);

  const ranked = rankCases(
    trackACases.map((c) => ({
      caseId: c.id,
      tier: c.formulaResult!.tier === "TIER_1" ? 1 : 2,
      overdueDays: c.formulaResult!.overdueDays ?? 0,
    }))
  );

  const rankedWithDetail = ranked.map((r) => {
    const c = trackACases.find((tc) => tc.id === r.caseId)!;
    return {
      caseId: c.id,
      personName: c.person.nameVariants[0] ?? "Unknown",
      tier: r.tier,
      overdueDays: r.overdueDays,
      governingSection: c.formulaResult!.governingSection.code,
      applicableFraction: c.formulaResult!.applicableFraction,
      thresholdDays: c.formulaResult!.thresholdDays,
      daysInCustody: c.formulaResult!.daysInCustody,
      exclusionStatus: c.exclusionStatus,
      caseStatus: c.caseStatus,
    };
  });

  const trackB = trackBFlags.map((f) => ({
    caseId: f.caseId,
    personName: f.case.person.nameVariants[0] ?? "Unknown",
    daysSinceBail: f.daysSinceBail,
    caseStatus: f.case.caseStatus,
  }));

  await logAudit({
    actorUserId: session.userId,
    action: "viewed_ranked_list",
    entity: "Case",
    ipAddress: null,
  });

  return NextResponse.json({ trackA: rankedWithDetail, trackB });
}
