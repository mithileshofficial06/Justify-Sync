import { thresholdFor } from "./threshold";
import type { Tier } from "./types";

/**
 * Turns a computed result back into the plain-language derivation a judge
 * can re-check with a calculator. Pure: it re-derives nothing the engine did
 * not already decide, it only shows the working.
 */

export interface ExplainSection {
  law: string;
  code: string;
  title?: string | null;
  maxSentenceDays: number;
  isDeathOrLife: boolean;
  isGraded?: boolean;
  gradedBand?: string | null;
  isFineOnly?: boolean;
}

export interface ExplainInput {
  chargedSections: ExplainSection[];
  governingSection: ExplainSection;
  applicableFraction: number;
  thresholdDays: number;
  daysInCustody: number;
  tier: Tier;
  overdueDays: number | null;
  arrestDate: Date;
  arrestDateIsProxy?: boolean;
}

export interface DerivationLine {
  label: string;
  value: string;
  note?: string;
}

export interface Derivation {
  lines: DerivationLine[];
  comparison: { operator: ">=" | "<"; left: string; right: string };
  verdict: string;
  verdictTone: "tier1" | "tier2" | "not_yet";
  gradedNote: string | null;
  orderingCheck: OrderingCheck | null;
}

export interface OrderingCheck {
  wrongThresholdDays: number;
  wrongOverdueDays: number;
  correctOverdueDays: number;
  understatedBy: number;
}

const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;

export function formatDays(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatDateDMY(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

export function describeTerm(days: number): string {
  if (days % DAYS_PER_YEAR === 0) {
    const y = days / DAYS_PER_YEAR;
    return `${y} year${y === 1 ? "" : "s"}`;
  }
  if (days % DAYS_PER_MONTH === 0 && days < DAYS_PER_YEAR) {
    const m = days / DAYS_PER_MONTH;
    return `${m} month${m === 1 ? "" : "s"}`;
  }
  return `${formatDays(days)} days`;
}

export function fractionLabel(f: number): "1/3" | "1/2" {
  return Math.abs(f - 1 / 3) < 0.001 ? "1/3" : "1/2";
}

export function sectionLabel(s: Pick<ExplainSection, "law" | "code">): string {
  return `${s.law} ${s.code}`;
}

/**
 * v4 Flaw #20 made visible: what a first-time offender's ranking would have
 * been if the 1/2 limb had been tested before the fraction was selected.
 * Only meaningful when 1/3 applies and custody has also crossed the 1/2 mark —
 * otherwise the wrong order would not produce a comparable overdue figure.
 */
export function fractionOrderingCheck(
  maxSentenceDays: number,
  applicableFraction: number,
  daysInCustody: number,
  isFineOnly = false
): OrderingCheck | null {
  if (isFineOnly || fractionLabel(applicableFraction) !== "1/3") return null;
  const correctThreshold = thresholdFor(maxSentenceDays, 1 / 3);
  const wrongThreshold = thresholdFor(maxSentenceDays, 1 / 2);
  if (daysInCustody < wrongThreshold) return null;
  const correctOverdueDays = daysInCustody - correctThreshold;
  const wrongOverdueDays = daysInCustody - wrongThreshold;
  return {
    wrongThresholdDays: wrongThreshold,
    wrongOverdueDays,
    correctOverdueDays,
    understatedBy: correctOverdueDays - wrongOverdueDays,
  };
}

export function explainDecision(input: ExplainInput): Derivation {
  const gov = input.governingSection;
  const fraction = fractionLabel(input.applicableFraction);
  const lines: DerivationLine[] = [];

  lines.push({
    label: "Charged sections",
    value: input.chargedSections.map(sectionLabel).join(", "),
  });

  const multiple = input.chargedSections.length > 1;
  lines.push({
    label: "Governing section",
    value: sectionLabel(gov),
    note: multiple ? "highest maximum of those charged" : "only section charged",
  });

  if (gov.isFineOnly) {
    lines.push({ label: "Maximum sentence", value: "fine only — no imprisonment possible" });
  } else {
    lines.push({
      label: "Maximum sentence",
      value: `${describeTerm(gov.maxSentenceDays)}  =  ${formatDays(gov.maxSentenceDays)} days`,
    });
  }

  lines.push({
    label: "Prior conviction",
    value: fraction === "1/3" ? "none on record" : "previously convicted",
    note: `applicable fraction = ${fraction}`,
  });

  if (gov.isFineOnly) {
    lines.push({ label: "Applicable threshold", value: "0 days", note: "no custodial term to take a fraction of" });
  } else {
    lines.push({
      label: "Applicable threshold",
      value: `${formatDays(gov.maxSentenceDays)}  x  ${fraction}  =  ${formatDays(input.thresholdDays)} days`,
      note: "rounded up",
    });
  }

  lines.push({
    label: "Days in custody",
    value: formatDays(input.daysInCustody),
    note: `${input.arrestDateIsProxy ? "earliest recorded date" : "arrested"} ${formatDateDMY(input.arrestDate)}, continuous`,
  });

  const met = input.tier !== null;
  const comparison = {
    operator: (met ? ">=" : "<") as ">=" | "<",
    left: formatDays(input.daysInCustody),
    right: formatDays(input.thresholdDays),
  };

  let verdict: string;
  let verdictTone: Derivation["verdictTone"];
  if (input.tier === 1) {
    verdictTone = "tier1";
    verdict = gov.isFineOnly
      ? `TIER 1 — held ${formatDays(input.daysInCustody)} days for an offence that carries no imprisonment`
      : `TIER 1 ELIGIBLE — custody has passed the full ${describeTerm(gov.maxSentenceDays)} maximum; ${formatDays(input.overdueDays ?? 0)} days overdue`;
  } else if (input.tier === 2) {
    verdictTone = "tier2";
    verdict = `TIER 2 ELIGIBLE,  ${formatDays(input.overdueDays ?? 0)} days overdue`;
  } else {
    verdictTone = "not_yet";
    verdict = `NOT YET ELIGIBLE — ${formatDays(input.thresholdDays - input.daysInCustody)} days to go`;
  }

  let gradedNote: string | null = null;
  if (gov.isGraded) {
    gradedNote = gov.gradedBand
      ? `${sectionLabel(gov)} is a graded section — punishment depends on the facts. This record establishes the "${gov.gradedBand}" band, so that band's maximum is used.`
      : `${sectionLabel(gov)} is a graded section and the record does not establish the band — the conservative (higher) maximum is used, which can only make the threshold later, never earlier.`;
  }

  return {
    lines,
    comparison,
    verdict,
    verdictTone,
    gradedNote,
    orderingCheck: fractionOrderingCheck(gov.maxSentenceDays, input.applicableFraction, input.daysInCustody, gov.isFineOnly),
  };
}
