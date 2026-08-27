import type { FormulaResult, Section, Tier } from "./types";

/**
 * v5 Stage 5 / v4 Flaw #20: the fraction is selected from conviction
 * history FIRST, and only then are the two statutory limbs tested.
 * Testing tiers in fraction order first would measure a first-time
 * offender against 1/2 instead of the 1/3 that actually applies to them,
 * understating how overdue they are.
 */
export function applicableFraction(priorConvictions: boolean): number {
  return priorConvictions ? 1 / 2 : 1 / 3;
}

/**
 * Tier 1 (full term served) always outranks Tier 2 (threshold met) —
 * the most egregious cohort: detained beyond any sentence they could
 * have received at all.
 */
export function classifyTier(
  daysInCustodyCount: number,
  governingSection: Section,
  priorConvictions: boolean
): FormulaResult {
  const fraction = applicableFraction(priorConvictions);
  const maxSentenceDays = governingSection.maxSentenceDays;
  // Rounded up, not down: spec's own worked example (325 IPC, 2,555 days,
  // 1/3) gives a threshold of 852 days, not 851 (2555/3 = 851.67).
  const thresholdDays = Math.ceil(maxSentenceDays * fraction);

  let tier: Tier;
  let overdueDays: number | null = null;
  let remainingDays: number | null = null;

  // overdue_days is always measured against the applicable threshold, per
  // spec Step 5 — not against max sentence, even for Tier 1. Threshold is
  // always <= max sentence, so this ranks Tier 1 consistently with Tier 2.
  if (daysInCustodyCount >= maxSentenceDays) {
    tier = 1;
    overdueDays = daysInCustodyCount - thresholdDays;
  } else if (daysInCustodyCount >= thresholdDays) {
    tier = 2;
    overdueDays = daysInCustodyCount - thresholdDays;
  } else {
    tier = null;
    remainingDays = thresholdDays - daysInCustodyCount;
  }

  return {
    governingSectionId: governingSection.id,
    applicableFraction: fraction,
    thresholdDays,
    daysInCustody: daysInCustodyCount,
    tier,
    overdueDays,
    remainingDays,
  };
}
