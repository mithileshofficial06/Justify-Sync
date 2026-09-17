import { describe, expect, it } from "vitest";
import { isHedgedBooleanClaim, quotesFullSentence } from "../../src/lib/ai/extraction";
import { buildCaseUpdateFromFacts } from "../../src/lib/ai/applyExtraction";
import { checkExclusions } from "../../src/lib/engine/exclusions";
import { daysInCustody } from "../../src/lib/engine/custody";
import { getGoverningSection } from "../../src/lib/engine/governingSection";
import { classifyTier } from "../../src/lib/engine/threshold";
import { checkSuretyFailure } from "../../src/lib/engine/trackB";
import { fractionOrderingCheck } from "../../src/lib/engine/explain";
import type { Section } from "../../src/lib/engine/types";
import { sections } from "./sections";
import { SIH_CASES, buildCase } from "./sihCases";

const kb = new Map<string, Section>(sections.map((s) => [s.id, s]));
const now = new Date();

/** Mirrors computeCase() without the database, so the seed's intended outcomes are pinned. */
function runPipeline(key: string) {
  const spec = SIH_CASES.find((c) => c.key === key)!;
  const built = buildCase(spec, now);
  const update = buildCaseUpdateFromFacts(built.facts);
  const chargedSectionIds = update.chargedSectionIds ?? [];
  const priorsFact = built.facts.find((f) => f.fieldName === "priorConvictions" && f.confidence >= 0.7);
  const priorConvictions = priorsFact?.value === "true" ? true : priorsFact?.value === "false" ? false : null;
  const charged = chargedSectionIds.map((id) => kb.get(id)!);
  const gov = getGoverningSection(chargedSectionIds, kb);
  const caseInput = {
    id: key,
    arrestDate: update.arrestDate!,
    chargedSectionIds,
    priorConvictions,
    isJuvenile: spec.isJuvenile ?? false,
    pendingCaseFlag: update.pendingCaseFlag === "NONE" ? ("none" as const) : ("unknown" as const),
    specialActFlag: (spec.specialActFlag ?? false) || charged.some((s) => s.isSpecialAct),
    custodyStatus: spec.custody,
    bailGranted: update.bailGranted ?? false,
    bailOrderDate: update.bailOrderDate ?? null,
  };
  const exclusion = checkExclusions(caseInput, gov);
  const eligible = exclusion.status === "clear" || exclusion.status === "stricter_scrutiny";
  const result = eligible ? classifyTier(daysInCustody(caseInput.arrestDate, now), gov, priorConvictions!) : null;
  const trackB = checkSuretyFailure(caseInput, now);
  return { spec, built, update, gov, exclusion, result, trackB };
}

describe("SIH seed dataset", () => {
  it("has unique fixture keys and covers all ten seed-plan profiles", () => {
    expect(new Set(SIH_CASES.map((c) => c.key)).size).toBe(SIH_CASES.length);
    const plan = new Set(SIH_CASES.map((c) => c.seedPlanNo).filter((n) => n !== null));
    expect([...plan].sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  for (const spec of SIH_CASES) {
    describe(spec.key, () => {
      it("every pre-computed fact passes the live extractor's grounding and hedge filters", () => {
        const { chargeSheetText, facts } = buildCase(spec, now);
        for (const f of facts) {
          expect(chargeSheetText.includes(f.sourceSentence), `${f.fieldName} quote not in document`).toBe(true);
          expect(quotesFullSentence(chargeSheetText, f.sourceSentence), `${f.fieldName} quote is truncated`).toBe(true);
          expect(isHedgedBooleanClaim(f), `${f.fieldName} would be rejected as hedged`).toBe(false);
        }
      });

      it("every charged section resolves to a knowledge-base row", () => {
        const { update, built } = runPipeline(spec.key);
        const expected = built.facts.find((f) => f.fieldName === "chargedSections")!.value.split(",").length;
        expect(update.chargedSectionIds?.length).toBe(expected);
      });

      it(`engine reaches the intended outcome: ${spec.expect.exclusion} / tier ${spec.expect.tier}`, () => {
        const { exclusion, result, trackB } = runPipeline(spec.key);
        expect(exclusion.status.toUpperCase()).toBe(spec.expect.exclusion);
        expect(result?.tier ?? null).toBe(spec.expect.tier);
        if (spec.expect.overdueDays !== undefined) expect(result?.overdueDays).toBe(spec.expect.overdueDays);
        expect(trackB.status === "flagged").toBe(spec.expect.trackB);
      });
    });
  }

  it("profile #3 reproduces the demo's fraction-ordering line (548 vs 122 days)", () => {
    const { result, gov } = runPipeline("sih-03-fraction-ordering");
    expect(fractionOrderingCheck(gov.maxSentenceDays, result!.applicableFraction, result!.daysInCustody)).toMatchObject({
      correctOverdueDays: 548,
      wrongOverdueDays: 122,
    });
  });

  it("the hedged antecedents sentence produces no prior-conviction fact at all", () => {
    const { built } = runPipeline("sih-05-blank-priors");
    expect(built.facts.some((f) => f.fieldName === "priorConvictions")).toBe(false);
    expect(built.chargeSheetText).toMatch(/still awaited/);
  });
});
