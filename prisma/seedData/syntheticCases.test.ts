import { describe, expect, it } from "vitest";
import { checkExclusions } from "../../src/lib/engine/exclusions";
import { daysInCustody } from "../../src/lib/engine/custody";
import { classifyTier } from "../../src/lib/engine/threshold";
import type { CaseInput, Section } from "../../src/lib/engine/types";
import { sections } from "./sections";
import { buildSyntheticCases } from "./syntheticCases";

const kb = new Map<string, Section>(
  sections.map((s) => [
    s.id,
    { id: s.id, code: s.code, law: s.law, maxSentenceDays: s.maxSentenceDays, isDeathOrLife: s.isDeathOrLife },
  ])
);

/**
 * What a CORRECT extraction of each synthetic charge sheet should produce
 * — this is the ground truth the AI extraction pipeline is being tested
 * against elsewhere (manually / in the synthetic flow script), and here we
 * verify the ENGINE reaches the intended tier/exclusion from those facts.
 * This catches arithmetic mistakes in the synthetic data itself (wrong day
 * counts, wrong section) before anyone relies on it.
 */
const perfectExtractionByKey: Record<string, { sectionId: string; priorConvictions: boolean | null }> = {
  "tier2-first-timer": { sectionId: "IPC_325", priorConvictions: false },
  "tier2-prior-conviction": { sectionId: "IPC_420", priorConvictions: true },
  "tier1-full-term": { sectionId: "IPC_379", priorConvictions: false },
  "not-yet-eligible": { sectionId: "IPC_411", priorConvictions: false },
  "stricter-scrutiny-ndps": { sectionId: "NDPS_21", priorConvictions: false },
  "needs-review-unclear-priors": { sectionId: "IPC_325", priorConvictions: null },
  "excluded-juvenile": { sectionId: "IPC_379", priorConvictions: false },
};

describe("synthetic case ground truth matches the engine's actual output", () => {
  const now = new Date();
  const cases = buildSyntheticCases(now);

  for (const c of cases) {
    it(`${c.key}: ${c.label}`, () => {
      const extraction = perfectExtractionByKey[c.key];
      expect(extraction, `no ground-truth extraction mapping for ${c.key}`).toBeDefined();

      const section = kb.get(extraction.sectionId);
      expect(section, `unknown section ${extraction.sectionId}`).toBeDefined();

      // Reverse-engineer the exact arrest date embedded in the generated
      // text so this test tracks the real generator, not a duplicated
      // day-count computed independently (which could silently drift).
      const dateMatch = c.chargeSheetText.match(/arrested on (\d{2})\.(\d{2})\.(\d{4})/);
      expect(dateMatch, "could not find arrest date in generated text").toBeDefined();
      const [, dd, mm, yyyy] = dateMatch!;
      const arrestDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

      const caseInput: CaseInput = {
        id: c.key,
        arrestDate,
        chargedSectionIds: [extraction.sectionId],
        priorConvictions: extraction.priorConvictions,
        isJuvenile: c.isJuvenile,
        pendingCaseFlag: "none",
        specialActFlag: c.specialActFlag,
        custodyStatus: c.custodyStatus,
        bailGranted: false,
        bailOrderDate: null,
      };

      const exclusion = checkExclusions(caseInput, section!);
      expect(exclusion.status.toUpperCase()).toBe(c.groundTruth.exclusionStatus);

      if (exclusion.status === "clear" || exclusion.status === "stricter_scrutiny") {
        expect(extraction.priorConvictions).not.toBeNull();
        const custodyDays = daysInCustody(arrestDate, now);
        const result = classifyTier(custodyDays, section!, extraction.priorConvictions!);
        expect(result.tier).toBe(c.groundTruth.tier);
      } else {
        expect(c.groundTruth.tier).toBeNull();
      }
    });
  }
});
