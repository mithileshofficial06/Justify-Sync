import { db } from "@/lib/db";

/**
 * v5 Stage 12 — State Admin's aggregated, per-district view. This reports
 * on cases THIS SYSTEM has processed, not true population coverage (that
 * needs an external total-prisoner count from e-Prisons, which isn't wired
 * up — see SPEC.md/v4 Flaw #9). Don't extrapolate a "% of population"
 * figure from this without that external denominator.
 */
export async function getStateOverview() {
  const districts = await db.district.findMany({
    include: {
      cases: {
        include: { formulaResult: true, trackBFlag: true },
      },
    },
  });

  return districts.map((d) => {
    const total = d.cases.length;
    const tier1 = d.cases.filter((c) => c.formulaResult?.tier === "TIER_1").length;
    const tier2 = d.cases.filter((c) => c.formulaResult?.tier === "TIER_2").length;
    const trackB = d.cases.filter((c) => c.trackBFlag).length;
    const filed = d.cases.filter((c) =>
      ["FILED", "HEARD", "BAIL_GRANTED", "RELEASED"].includes(c.caseStatus)
    ).length;
    const released = d.cases.filter((c) => c.caseStatus === "RELEASED").length;
    const needsReview = d.cases.filter(
      (c) => c.exclusionStatus === "STRICTER_SCRUTINY" || c.exclusionStatus === "NEEDS_HUMAN_REVIEW"
    ).length;

    return {
      districtId: d.id,
      districtName: d.name,
      state: d.state,
      totalCasesTracked: total,
      tier1,
      tier2,
      trackB,
      filed,
      released,
      needsReview,
      filingRate: tier1 + tier2 > 0 ? filed / (tier1 + tier2) : null,
      releaseRate: filed > 0 ? released / filed : null,
    };
  });
}
