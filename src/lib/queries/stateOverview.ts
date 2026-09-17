import { db } from "@/lib/db";

const ORDER = ["IDENTIFIED", "DELIVERED", "FILED", "HEARD", "BAIL_GRANTED", "RELEASED"] as const;
type Stage = (typeof ORDER)[number];

export const FUNNEL_STAGES = [
  { key: "identified", label: "Identified", from: "IDENTIFIED" },
  { key: "delivered", label: "Delivered", from: "DELIVERED" },
  { key: "filed", label: "Filed", from: "FILED" },
  { key: "granted", label: "Bail granted", from: "BAIL_GRANTED" },
  { key: "released", label: "Released", from: "RELEASED" },
] as const satisfies readonly { key: string; label: string; from: Stage }[];

export type FunnelCounts = Record<(typeof FUNNEL_STAGES)[number]["key"], number>;

/** The furthest pipeline stage a case has reached, from its event history and current status. */
function furthestStage(caseStatus: Stage, eventStatuses: Stage[]): number {
  return Math.max(ORDER.indexOf(caseStatus), ...eventStatuses.map((s) => ORDER.indexOf(s)));
}

/**
 * v5 Stage 12 — State Admin's per-district view, shaped like the national
 * funnel (identified -> filed -> granted -> released) but live. Reports on
 * cases this system tracks, not total prison population — that denominator
 * needs e-Prisons (v4 Flaw #9), so no "% of population" figure is derived.
 */
export async function getStateOverview() {
  const districts = await db.district.findMany({
    orderBy: { name: "asc" },
    include: {
      cases: {
        include: { formulaResult: true, trackBFlag: true, statusEvents: { select: { status: true } } },
      },
    },
  });

  const rows = districts.map((d) => {
    const funnel: FunnelCounts = { identified: 0, delivered: 0, filed: 0, granted: 0, released: 0 };
    for (const c of d.cases) {
      // Only cases this system identified enter the §479 funnel; a Track B case
      // whose bail came first never went through identification or filing here.
      if (!c.statusEvents.some((e) => e.status === "IDENTIFIED")) continue;
      const reached = furthestStage(c.caseStatus, c.statusEvents.map((e) => e.status));
      for (const stage of FUNNEL_STAGES) {
        if (reached >= ORDER.indexOf(stage.from)) funnel[stage.key]++;
      }
    }

    const inside = d.cases.filter((c) => c.custodyStatus === "in_custody" && c.caseStatus !== "RELEASED");
    const eligibleInside = inside.filter((c) => c.exclusionStatus === "CLEAR" || c.exclusionStatus === "STRICTER_SCRUTINY");

    return {
      districtId: d.id,
      districtName: d.name,
      state: d.state,
      tracked: d.cases.length,
      tier1: eligibleInside.filter((c) => c.formulaResult?.tier === "TIER_1").length,
      tier2: eligibleInside.filter((c) => c.formulaResult?.tier === "TIER_2").length,
      trackB: inside.filter((c) => c.trackBFlag).length,
      needsReview: d.cases.filter((c) => c.exclusionStatus === "STRICTER_SCRUTINY" || c.exclusionStatus === "NEEDS_HUMAN_REVIEW").length,
      funnel,
      filingRate: funnel.identified > 0 ? funnel.filed / funnel.identified : null,
      releaseRate: funnel.filed > 0 ? funnel.released / funnel.filed : null,
    };
  });

  const total = rows.reduce(
    (acc, r) => {
      for (const s of FUNNEL_STAGES) acc.funnel[s.key] += r.funnel[s.key];
      acc.tracked += r.tracked;
      acc.tier1 += r.tier1;
      acc.tier2 += r.tier2;
      acc.trackB += r.trackB;
      acc.needsReview += r.needsReview;
      return acc;
    },
    { tracked: 0, tier1: 0, tier2: 0, trackB: 0, needsReview: 0, funnel: { identified: 0, delivered: 0, filed: 0, granted: 0, released: 0 } as FunnelCounts }
  );

  return {
    districts: rows,
    total: {
      ...total,
      filingRate: total.funnel.identified > 0 ? total.funnel.filed / total.funnel.identified : null,
      releaseRate: total.funnel.filed > 0 ? total.funnel.released / total.funnel.filed : null,
    },
  };
}
