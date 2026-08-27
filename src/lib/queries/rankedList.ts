import { db } from "@/lib/db";
import { rankCases } from "@/lib/engine/rank";
import type { SessionClaims } from "@/lib/auth/jwt";

export async function getRankedList(session: SessionClaims) {
  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const [trackACases, trackBFlags] = await Promise.all([
    db.case.findMany({
      where: { ...districtFilter, formulaResult: { tier: { not: null } } },
      include: { person: true, formulaResult: { include: { governingSection: true } } },
    }),
    db.trackBFlag.findMany({
      where: { case: districtFilter },
      include: { case: { include: { person: true } } },
    }),
  ]);

  const ranked = rankCases(
    trackACases.map((c) => ({
      caseId: c.id,
      tier: c.formulaResult!.tier === "TIER_1" ? (1 as const) : (2 as const),
      overdueDays: c.formulaResult!.overdueDays ?? 0,
    }))
  );

  const trackA = ranked.map((r) => {
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

  return { trackA, trackB };
}
