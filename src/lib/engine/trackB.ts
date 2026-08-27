import type { CaseInput } from "./types";
import { daysSince } from "./custody";

export type SuretyCheckResult =
  | { status: "flagged"; daysSinceBail: number }
  | { status: "clear"; daysSinceBail: number | null }
  | { status: "data_quality_review"; daysSinceBail: null };

/**
 * v5 Stage 6 — Track B: bail granted, still in custody (probable surety
 * failure). Needs no sentencing law, no knowledge base, no extraction —
 * just "was bail granted?" and "are they still inside?".
 *
 * v4 Flaw #22: a bail-granted case with no linked order date is a
 * data-quality problem, not evidence of "no bail granted" — it must be
 * surfaced for review, never silently dropped.
 */
export function checkSuretyFailure(
  caseInput: CaseInput,
  today: Date = new Date()
): SuretyCheckResult {
  if (!caseInput.bailGranted) {
    return { status: "clear", daysSinceBail: null };
  }

  if (!caseInput.bailOrderDate) {
    return { status: "data_quality_review", daysSinceBail: null };
  }

  if (caseInput.custodyStatus !== "in_custody") {
    return { status: "clear", daysSinceBail: null };
  }

  const daysSinceBail = daysSince(caseInput.bailOrderDate, today);
  return daysSinceBail >= 7
    ? { status: "flagged", daysSinceBail }
    : { status: "clear", daysSinceBail };
}
