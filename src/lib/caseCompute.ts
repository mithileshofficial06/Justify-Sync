import { db } from "@/lib/db";
import { checkExclusions } from "@/lib/engine/exclusions";
import { getGoverningSection } from "@/lib/engine/governingSection";
import { daysInCustody } from "@/lib/engine/custody";
import { classifyTier } from "@/lib/engine/threshold";
import { checkSuretyFailure } from "@/lib/engine/trackB";
import type { CaseInput, Section } from "@/lib/engine/types";

/**
 * v5 Stages 4-7 wired to real data: exclusions checked first, then Track A
 * (fixed formula) and Track B (surety check) run in parallel, results
 * persisted. This is the only place the pure engine (lib/engine/) touches
 * the database — the engine itself stays free of any DB or AI dependency.
 */
export async function computeCase(caseId: string) {
  const dbCase = await db.case.findUniqueOrThrow({ where: { id: caseId } });

  const sections = await db.knowledgeBaseSection.findMany({
    where: { id: { in: dbCase.chargedSectionIds } },
  });
  const knowledgeBase = new Map<string, Section>(
    sections.map((s) => [
      s.id,
      { id: s.id, code: s.code, law: s.law, maxSentenceDays: s.maxSentenceDays, isDeathOrLife: s.isDeathOrLife },
    ])
  );

  // v4 Flaw #12: prior-conviction status has no dedicated Case column on
  // purpose — it must come from a grounded ExtractedFact (Stage 3), never
  // be silently assumed. Missing/low-confidence stays null -> exclusions
  // routes it to needs_human_review rather than guessing "no priors".
  const priorConvictionsFact = await db.extractedFact.findFirst({
    where: { caseId, fieldName: "priorConvictions", confidence: { gte: 0.7 } },
    orderBy: { extractedAt: "desc" },
  });
  const priorConvictions =
    priorConvictionsFact?.value === "true"
      ? true
      : priorConvictionsFact?.value === "false"
        ? false
        : null;

  const caseInput: CaseInput = {
    id: dbCase.id,
    arrestDate: dbCase.arrestDate,
    chargedSectionIds: dbCase.chargedSectionIds,
    priorConvictions,
    isJuvenile: dbCase.isJuvenile,
    pendingCaseFlag: dbCase.pendingCaseFlag.toLowerCase() as CaseInput["pendingCaseFlag"],
    specialActFlag: dbCase.specialActFlag,
    custodyStatus: dbCase.custodyStatus as CaseInput["custodyStatus"],
    bailGranted: dbCase.bailGranted,
    bailOrderDate: dbCase.bailOrderDate,
  };

  const governingSection = getGoverningSection(dbCase.chargedSectionIds, knowledgeBase);
  const exclusion = checkExclusions(caseInput, governingSection);

  await db.case.update({
    where: { id: caseId },
    data: {
      exclusionStatus: exclusion.status.toUpperCase() as never,
      exclusionReason: "reason" in exclusion ? exclusion.reason : null,
    },
  });

  // Track A only runs if the case is clear or flagged for stricter scrutiny
  // (still ranked, just routed to mandatory review) — never for a hard exclusion.
  let formulaResult = null;
  if (exclusion.status === "clear" || exclusion.status === "stricter_scrutiny") {
    const custodyDays = daysInCustody(dbCase.arrestDate);
    if (caseInput.priorConvictions === null) {
      // Should be unreachable — checkExclusions returns needs_human_review
      // for a null priorConvictions, which is filtered out above. Fail loud
      // rather than silently defaulting to the more lenient 1/3 fraction.
      throw new Error(`computeCase invariant violated: case ${caseId} reached Track A with unresolved prior-conviction status.`);
    }
    const result = classifyTier(custodyDays, governingSection, caseInput.priorConvictions);

    formulaResult = await db.formulaResult.upsert({
      where: { caseId },
      update: {
        governingSectionId: result.governingSectionId,
        applicableFraction: result.applicableFraction,
        thresholdDays: result.thresholdDays,
        daysInCustody: result.daysInCustody,
        tier: result.tier ? (`TIER_${result.tier}` as "TIER_1" | "TIER_2") : null,
        overdueDays: result.overdueDays,
      },
      create: {
        caseId,
        governingSectionId: result.governingSectionId,
        applicableFraction: result.applicableFraction,
        thresholdDays: result.thresholdDays,
        daysInCustody: result.daysInCustody,
        tier: result.tier ? (`TIER_${result.tier}` as "TIER_1" | "TIER_2") : null,
        overdueDays: result.overdueDays,
      },
    });
  }

  // Track B runs independently of exclusions — it needs no sentencing law.
  const trackB = checkSuretyFailure(caseInput);
  let trackBFlag = null;
  if (trackB.status === "flagged" || trackB.status === "data_quality_review") {
    trackBFlag = await db.trackBFlag.upsert({
      where: { caseId },
      update: { bailOrderDate: dbCase.bailOrderDate, daysSinceBail: trackB.daysSinceBail },
      create: { caseId, bailOrderDate: dbCase.bailOrderDate, daysSinceBail: trackB.daysSinceBail },
    });
  }

  return { exclusion, formulaResult, trackB: { ...trackB, record: trackBFlag } };
}
