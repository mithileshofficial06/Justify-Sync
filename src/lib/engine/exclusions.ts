import type { CaseInput, ExclusionResult, Section } from "./types";

/**
 * Stage 4 (v5) — checked before any eligibility math runs.
 * Special-act cases are flagged for stricter scrutiny, never auto-excluded —
 * courts have applied §436A/§479 to those cases too (v4 Flaw #17).
 */
export function checkExclusions(
  caseInput: CaseInput,
  governingSection: Section
): ExclusionResult {
  // Juvenile first: a minor charged with a life-eligible offence still belongs
  // under the JJ Act, and that is the more useful routing to report.
  if (caseInput.isJuvenile) {
    return {
      status: "excluded",
      reason: "Accused was a minor at the time of the offence — governed by the Juvenile Justice Act, not BNSS.",
    };
  }

  // Graded section whose band is not established AND one band carries life:
  // the band decides whether the §479 carve-out applies at all, so neither
  // excluding nor ranking is safe — a lawyer must settle the facts.
  if (governingSection.isGraded && !governingSection.gradedBand && governingSection.isDeathOrLife) {
    return {
      status: "needs_human_review",
      reason: `Graded section (${governingSection.law} ${governingSection.code}) and the record does not establish which part applies — one part carries life imprisonment, so the band decides whether §479 applies at all.`,
    };
  }

  if (governingSection.isDeathOrLife) {
    return {
      status: "excluded",
      reason: "Death penalty or life imprisonment is a possible sentence for the governing section — statutory carve-out under §479 itself.",
    };
  }

  if (caseInput.pendingCaseFlag === "confirmed_multi") {
    return {
      status: "excluded",
      reason: "Confirmed match: more than one pending case against the accused (§479(2)).",
    };
  }

  if (caseInput.pendingCaseFlag === "unknown") {
    return {
      status: "needs_human_review",
      reason: "Could not confirm whether the accused has other pending cases — entity resolution is uncertain, never silently treated as \"none\".",
    };
  }

  if (caseInput.priorConvictions === null) {
    return {
      status: "needs_human_review",
      reason: "Prior-conviction field is blank/unclear — never assumed \"no priors\" (v4 Flaw #12).",
    };
  }

  if (caseInput.specialActFlag || governingSection.isSpecialAct) {
    return {
      status: "stricter_scrutiny",
      reason: "Charged under NDPS/UAPA/PMLA/POCSO/MCOCA or a state security act — routed to mandatory lawyer review, not auto-ranked. Still ranked, because courts have applied §479 to special-act undertrials too (v4 Flaw #17).",
    };
  }

  return { status: "clear" };
}
