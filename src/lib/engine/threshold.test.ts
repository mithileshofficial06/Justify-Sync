import { describe, expect, it } from "vitest";
import { classifyTier } from "./threshold";
import type { Section } from "./types";

const SECTION_325_IPC: Section = {
  id: "IPC_325",
  code: "325",
  law: "IPC",
  maxSentenceDays: 2555, // 7 years
  isDeathOrLife: false,
};

describe("classifyTier — worked examples from the spec (v4 §3)", () => {
  it("Tier 2, first-time offender, 288 days overdue", () => {
    // threshold = ceil(2555 * 1/3) = ceil(851.67) = 852, per the spec's own worked example
    const result = classifyTier(1140, SECTION_325_IPC, false);
    expect(result.tier).toBe(2);
    expect(result.thresholdDays).toBe(852);
    expect(result.overdueDays).toBe(288);
  });

  it("fraction is selected BEFORE tier testing (v4 Flaw #20) — same case, custody = 1,400 days", () => {
    const result = classifyTier(1400, SECTION_325_IPC, false);
    expect(result.applicableFraction).toBeCloseTo(1 / 3);
    expect(result.thresholdDays).toBe(852);
    expect(result.overdueDays).toBe(548);

    // Regression guard: if the 1/2 band had been tested first for this
    // first-time offender, threshold would be 1278 (ceil(2555/2)) and
    // overdueDays would be understated by hundreds of days (spec: 122).
    const wrongThresholdIfHalfTestedFirst = Math.ceil(2555 * (1 / 2));
    expect(1400 - wrongThresholdIfHalfTestedFirst).toBe(122);
    expect(result.overdueDays!).toBeGreaterThan(1400 - wrongThresholdIfHalfTestedFirst);
  });

  it("Tier 1: full term served ranks above Tier 2", () => {
    const result = classifyTier(2600, SECTION_325_IPC, false);
    expect(result.tier).toBe(1);
  });

  it("not yet eligible: reports remaining days, not overdue days", () => {
    const result = classifyTier(500, SECTION_325_IPC, false);
    expect(result.tier).toBeNull();
    expect(result.remainingDays).toBe(852 - 500);
    expect(result.overdueDays).toBeNull();
  });

  it("general rule (prior conviction) uses 1/2, not 1/3", () => {
    const result = classifyTier(1140, SECTION_325_IPC, true);
    expect(result.applicableFraction).toBeCloseTo(1 / 2);
    expect(result.thresholdDays).toBe(1278); // ceil(2555 * 0.5)
    expect(result.tier).toBeNull();
  });
});
