import { db } from "@/lib/db";
import { rankCases } from "@/lib/engine/rank";
import type { SessionClaims } from "@/lib/auth/jwt";

export async function getRankedList(session: SessionClaims) {
  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  // A released person is no longer an undertrial awaiting release — they stay
  // in the funnel statistics, never on the worklist.
  const stillInside = { custodyStatus: "in_custody", caseStatus: { not: "RELEASED" as const } };

  const [trackACases, trackBFlags, scanned, bySource, district] = await Promise.all([
    db.case.findMany({
      where: {
        ...districtFilter,
        ...stillInside,
        formulaResult: { tier: { not: null } },
        // Belt-and-suspenders: computeCase deletes the FormulaResult when a
        // recompute flips a case to excluded/needs-review, but a case that
        // is NOT clear or under stricter scrutiny must never be rankable
        // even if that cleanup were ever skipped.
        exclusionStatus: { in: ["CLEAR", "STRICTER_SCRUTINY"] },
      },
      include: { person: true, district: true, formulaResult: { include: { governingSection: true } } },
    }),
    db.trackBFlag.findMany({
      where: { case: { ...districtFilter, ...stillInside } },
      include: { case: { include: { person: true, district: true } } },
      orderBy: { daysSinceBail: "desc" },
    }),
    db.case.count({ where: { ...districtFilter, ...stillInside } }),
    db.case.groupBy({ by: ["dataSource"], where: { ...districtFilter, ...stillInside }, _count: true }),
    session.districtId ? db.district.findUnique({ where: { id: session.districtId } }) : null,
  ]);

  const ecourtsDatasets = await db.case.findMany({
    where: { ...districtFilter, dataSource: "ECOURTS_METADATA", sourceDataset: { not: null } },
    distinct: ["sourceDataset"],
    select: { sourceDataset: true },
  });

  const lastComputed = trackACases.reduce<Date | null>(
    (latest, c) => (!latest || c.formulaResult!.computedAt > latest ? c.formulaResult!.computedAt : latest),
    null
  );

  const ranked = rankCases(
    trackACases.map((c) => ({
      caseId: c.id,
      tier: c.formulaResult!.tier === "TIER_1" ? (1 as const) : (2 as const),
      overdueDays: c.formulaResult!.overdueDays ?? 0,
    }))
  );

  const trackA = ranked.map((r, index) => {
    const c = trackACases.find((tc) => tc.id === r.caseId)!;
    const fr = c.formulaResult!;
    return {
      rank: index + 1,
      caseId: c.id,
      personName: c.person.nameVariants[0] ?? "Unknown",
      districtName: c.district.name,
      tier: r.tier,
      overdueDays: r.overdueDays,
      governingSection: `${fr.governingSection.law} ${fr.governingSection.code}`,
      governingSectionTitle: fr.governingSection.title,
      isGraded: fr.governingSection.isGraded,
      isFineOnly: fr.governingSection.isFineOnly,
      maxSentenceDays: fr.governingSection.maxSentenceDays,
      applicableFraction: fr.applicableFraction,
      thresholdDays: fr.thresholdDays,
      daysInCustody: fr.daysInCustody,
      exclusionStatus: c.exclusionStatus,
      caseStatus: c.caseStatus,
      dataSource: c.dataSource,
      custodySource: c.custodySource,
      arrestDateIsProxy: c.arrestDateIsProxy,
    };
  });

  const trackB = trackBFlags.map((f) => ({
    caseId: f.caseId,
    personName: f.case.person.nameVariants[0] ?? "Unknown",
    districtName: f.case.district.name,
    bailOrderDate: f.bailOrderDate,
    daysSinceBail: f.daysSinceBail,
    caseStatus: f.case.caseStatus,
    dataSource: f.case.dataSource,
    custodySource: f.case.custodySource,
  }));

  const sourceCount = (s: "ECOURTS_METADATA" | "SYNTHETIC_CHARGE_SHEET" | "MANUAL_ENTRY") =>
    bySource.find((b) => b.dataSource === s)?._count ?? 0;

  return {
    trackA,
    trackB,
    header: {
      districtName: session.role === "STATE_ADMIN" ? "All districts" : (district?.name ?? "—"),
      scanned,
      eligible: trackA.length,
      tier1: trackA.filter((c) => c.tier === 1).length,
      tier2: trackA.filter((c) => c.tier === 2).length,
      lastComputed,
      sources: {
        ecourts: sourceCount("ECOURTS_METADATA"),
        synthetic: sourceCount("SYNTHETIC_CHARGE_SHEET"),
        manual: sourceCount("MANUAL_ENTRY"),
      },
      ecourtsDatasets: ecourtsDatasets.map((d) => d.sourceDataset!),
    },
  };
}
