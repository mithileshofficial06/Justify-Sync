import { describe, expect, it } from "vitest";
import { checkExclusions } from "../../src/lib/engine/exclusions";
import { getGoverningSection } from "../../src/lib/engine/governingSection";
import { classifyTier } from "../../src/lib/engine/threshold";
import type { CaseInput, Section } from "../../src/lib/engine/types";
import { KB_VERSION, sections } from "./sections";

const kb = new Map<string, Section>(sections.map((s) => [s.id, s]));

const baseCase: CaseInput = {
  id: "kb-test",
  arrestDate: new Date("2023-01-01"),
  chargedSectionIds: [],
  priorConvictions: false,
  isJuvenile: false,
  pendingCaseFlag: "none",
  specialActFlag: false,
  custodyStatus: "in_custody",
  bailGranted: false,
  bailOrderDate: null,
};

function decide(sectionIds: string[], daysInCustody: number, priorConvictions = false) {
  const gov = getGoverningSection(sectionIds, kb);
  const exclusion = checkExclusions({ ...baseCase, chargedSectionIds: sectionIds, priorConvictions }, gov);
  const eligible = exclusion.status === "clear" || exclusion.status === "stricter_scrutiny";
  return { gov, exclusion, result: eligible ? classifyTier(daysInCustody, gov, priorConvictions) : null };
}

describe("knowledge base integrity (Module 2 acceptance)", () => {
  it("has 40+ rows, all on one version, all cited and titled", () => {
    expect(sections.length).toBeGreaterThanOrEqual(40);
    for (const s of sections) {
      expect(s.version, s.id).toBe(KB_VERSION);
      expect(s.citation.length, `${s.id} citation`).toBeGreaterThan(10);
      expect(s.title.length, `${s.id} title`).toBeGreaterThan(3);
      expect(s.punishment.length, `${s.id} punishment`).toBeGreaterThan(3);
    }
  });

  it("has unique ids", () => {
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
  });

  it("every equivalentId points at a real row", () => {
    for (const s of sections) {
      if (s.equivalentId) expect(kb.has(s.equivalentId), `${s.id} -> ${s.equivalentId}`).toBe(true);
    }
  });

  it("every computable row has a usable maximum", () => {
    for (const s of sections) {
      if (s.isFineOnly) expect(s.maxSentenceDays, s.id).toBe(0);
      else if (!s.isDeathOrLife) expect(s.maxSentenceDays, s.id).toBeGreaterThan(0);
    }
  });

  it("includes every category the build doc requires", () => {
    expect(sections.some((s) => s.id === "IPC_304_PART_I")).toBe(true);
    expect(sections.some((s) => s.id === "IPC_304_PART_II")).toBe(true);
    expect(sections.some((s) => s.law === "TN Prohibition Act")).toBe(true);
    expect(sections.some((s) => s.law === "Arms Act")).toBe(true);
    expect(sections.some((s) => s.isFineOnly)).toBe(true);
    expect(sections.some((s) => s.isDeathOrLife && !s.isGraded)).toBe(true);
    for (const code of ["323", "325", "379", "380", "392", "411", "420", "457", "498A"]) {
      expect(sections.some((s) => s.law === "IPC" && s.code === code), `IPC ${code}`).toBe(true);
    }
  });
});

describe("engine on one case from each knowledge-base category", () => {
  it("death/life section: §479 carve-out fires", () => {
    expect(decide(["IPC_302"], 3000).exclusion.status).toBe("excluded");
  });

  it("death/life section charged alongside a minor one still governs", () => {
    const d = decide(["IPC_323", "BNS_103_1"], 3000);
    expect(d.gov.id).toBe("BNS_103_1");
    expect(d.exclusion.status).toBe("excluded");
  });

  it("graded §304, part not established: human review, not exclusion", () => {
    expect(decide(["IPC_304"], 2000).exclusion.status).toBe("needs_human_review");
  });

  it("graded §304 Part II: ranked on its own 10-year maximum", () => {
    const d = decide(["IPC_304_PART_II"], 1300);
    expect(d.exclusion.status).toBe("clear");
    expect(d.result!.thresholdDays).toBe(1217);
    expect(d.result!.tier).toBe(2);
  });

  it("graded §392, band not established: conservative 14-year maximum", () => {
    const d = decide(["IPC_392"], 1400);
    expect(d.result!.thresholdDays).toBe(1704);
    expect(d.result!.tier).toBeNull();
  });

  it("state act (TN Prohibition): computed like any other section", () => {
    const d = decide(["TNPA_4_1_A"], 700);
    expect(d.exclusion.status).toBe("clear");
    expect(d.result!.thresholdDays).toBe(609);
    expect(d.result!.tier).toBe(2);
  });

  it("special act (NDPS): stricter scrutiny, still ranked", () => {
    const d = decide(["NDPS_21_B"], 1300);
    expect(d.exclusion.status).toBe("stricter_scrutiny");
    expect(d.result!.tier).toBe(2);
  });

  it("fine-only (IPC 290): Tier 1 from the first day, no crash", () => {
    const d = decide(["IPC_290"], 20);
    expect(d.result!.tier).toBe(1);
    expect(d.result!.overdueDays).toBe(20);
  });

  it("BNS successor keeps its own changed maximum (IPC 406 3y vs BNS 316(2) 5y)", () => {
    expect(decide(["IPC_406"], 400).result!.thresholdDays).toBe(365);
    expect(decide(["BNS_316_2"], 400).result!.thresholdDays).toBe(609);
  });
});
