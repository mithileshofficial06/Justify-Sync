import type { GroundedFact } from "./extraction";
import { normalizeSectionText } from "./sectionLookup";

const CONFIDENT = 0.7;

export interface CaseFieldUpdate {
  arrestDate?: Date;
  chargedSectionIds?: string[];
  pendingCaseFlag?: "NONE";
  bailGranted?: boolean;
  bailOrderDate?: Date;
}

/**
 * Turns confident, structured facts into a Case row update. Anything below
 * threshold, or that fails to resolve (e.g. an unrecognized section), is
 * deliberately left out — it stays visible only as an ExtractedFact for a
 * human to resolve, never silently guessed onto the Case row.
 */
export function buildCaseUpdateFromFacts(facts: GroundedFact[]): CaseFieldUpdate {
  const update: CaseFieldUpdate = {};

  const arrestDateFact = facts.find((f) => f.fieldName === "arrestDate" && f.confidence >= CONFIDENT);
  if (arrestDateFact) {
    const parsedDate = new Date(arrestDateFact.value);
    if (!Number.isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
      update.arrestDate = parsedDate;
    }
  }

  const sectionFact = facts.find((f) => f.fieldName === "chargedSections" && f.confidence >= CONFIDENT);
  if (sectionFact) {
    const resolvedIds = sectionFact.value
      .split(",")
      .map((s) => normalizeSectionText(s))
      .filter((id): id is string => id !== null);
    if (resolvedIds.length > 0) {
      update.chargedSectionIds = resolvedIds;
    }
  }

  const pendingCasesFact = facts.find((f) => f.fieldName === "otherPendingCases" && f.confidence >= CONFIDENT);
  if (pendingCasesFact?.value === "false") {
    update.pendingCaseFlag = "NONE";
  }
  // "true" or "unclear" is deliberately NOT auto-set to CONFIRMED_MULTI here
  // — that requires entity resolution (v4 Flaw #18), not a single document
  // mention. It stays UNKNOWN, which exclusions already routes to review.

  const bailFact = facts.find((f) => f.fieldName === "bailOrder" && f.confidence >= CONFIDENT);
  if (bailFact && bailFact.value !== "none") {
    const parsedDate = new Date(bailFact.value);
    if (!Number.isNaN(parsedDate.getTime())) {
      update.bailGranted = true;
      update.bailOrderDate = parsedDate;
    }
  }

  return update;
}
