import { describe, expect, it } from "vitest";
import { checkExclusions } from "./exclusions";
import type { CaseInput, Section } from "./types";

const normalSection: Section = {
  id: "IPC_325",
  code: "325",
  law: "IPC",
  maxSentenceDays: 2555,
  isDeathOrLife: false,
};

const lifeSection: Section = { ...normalSection, id: "IPC_302", isDeathOrLife: true };

const baseCase: CaseInput = {
  id: "c1",
  arrestDate: new Date("2023-01-01"),
  chargedSectionIds: ["IPC_325"],
  priorConvictions: false,
  isJuvenile: false,
  pendingCaseFlag: "none",
  specialActFlag: false,
  custodyStatus: "in_custody",
  bailGranted: false,
  bailOrderDate: null,
};

describe("checkExclusions", () => {
  it("excludes death/life sentence cases", () => {
    expect(checkExclusions(baseCase, lifeSection).status).toBe("excluded");
  });

  it("excludes juveniles", () => {
    expect(checkExclusions({ ...baseCase, isJuvenile: true }, normalSection).status).toBe(
      "excluded"
    );
  });

  it("excludes confirmed multi-case matches", () => {
    expect(
      checkExclusions({ ...baseCase, pendingCaseFlag: "confirmed_multi" }, normalSection).status
    ).toBe("excluded");
  });

  it("routes unknown multi-case status to human review, never silently clears it", () => {
    expect(
      checkExclusions({ ...baseCase, pendingCaseFlag: "unknown" }, normalSection).status
    ).toBe("needs_human_review");
  });

  it("routes a blank prior-conviction field to human review, never assumes 'no priors' (v4 Flaw #12)", () => {
    expect(
      checkExclusions({ ...baseCase, priorConvictions: null }, normalSection).status
    ).toBe("needs_human_review");
  });

  it("flags special-act cases for stricter scrutiny, never auto-excludes them (v4 Flaw #17)", () => {
    expect(
      checkExclusions({ ...baseCase, specialActFlag: true }, normalSection).status
    ).toBe("stricter_scrutiny");
  });

  it("clears an ordinary case with none of the above", () => {
    expect(checkExclusions(baseCase, normalSection).status).toBe("clear");
  });
});
