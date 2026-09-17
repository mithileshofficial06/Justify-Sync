export interface Section {
  id: string;
  code: string;
  law: "IPC" | "BNS" | string;
  maxSentenceDays: number;
  isDeathOrLife: boolean;
  /** Punishment depends on facts (Part I/II, quantity, time of day), not the section number alone. */
  isGraded?: boolean;
  /** Which band this row represents; null on a graded row means the band is not established. */
  gradedBand?: string | null;
  /** No custodial sentence is possible at all. */
  isFineOnly?: boolean;
  /** NDPS / UAPA / PMLA / POCSO / MCOCA-type statute — stricter scrutiny, never auto-excluded. */
  isSpecialAct?: boolean;
}

export interface CaseInput {
  id: string;
  arrestDate: Date;
  chargedSectionIds: string[];
  priorConvictions: boolean | null;
  isJuvenile: boolean;
  pendingCaseFlag: "none" | "confirmed_multi" | "unknown";
  specialActFlag: boolean;
  custodyStatus: "in_custody" | "released";
  bailGranted: boolean;
  bailOrderDate: Date | null;
}

export type ExclusionResult =
  | { status: "excluded"; reason: string }
  | { status: "stricter_scrutiny"; reason: string }
  | { status: "needs_human_review"; reason: string }
  | { status: "clear" };

export type Tier = 1 | 2 | null;

export interface FormulaResult {
  governingSectionId: string;
  /** Exactly 1/3 (never previously convicted) or 1/2 (general rule). */
  applicableFraction: number;
  thresholdDays: number;
  daysInCustody: number;
  tier: Tier;
  overdueDays: number | null;
  remainingDays: number | null;
}

export interface RankedCase {
  caseId: string;
  tier: Tier;
  overdueDays: number;
}
