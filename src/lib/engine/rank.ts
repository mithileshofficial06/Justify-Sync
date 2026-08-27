import type { RankedCase } from "./types";

/**
 * v5 Stage 7: Tier 1 always ranks above Tier 2; within each tier,
 * most overdue first.
 */
export function rankCases(cases: RankedCase[]): RankedCase[] {
  return [...cases].sort((a, b) => {
    if (a.tier !== b.tier) {
      // Tier 1 before Tier 2; both before null (not-yet-eligible, shouldn't
      // be in a ranked list at all, but sort them last defensively).
      const tierOrder = (t: RankedCase["tier"]) => (t === 1 ? 0 : t === 2 ? 1 : 2);
      return tierOrder(a.tier) - tierOrder(b.tier);
    }
    return b.overdueDays - a.overdueDays;
  });
}
