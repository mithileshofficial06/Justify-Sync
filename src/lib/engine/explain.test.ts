import { describe, expect, it } from "vitest";
import { describeTerm, explainDecision, fractionOrderingCheck } from "./explain";

const IPC_325 = { law: "IPC", code: "325", maxSentenceDays: 2555, isDeathOrLife: false };
const IPC_323 = { law: "IPC", code: "323", maxSentenceDays: 365, isDeathOrLife: false };

describe("explainDecision — the SIH build doc's own target output (Module 4)", () => {
  const d = explainDecision({
    chargedSections: [IPC_325, IPC_323],
    governingSection: IPC_325,
    applicableFraction: 1 / 3,
    thresholdDays: 852,
    daysInCustody: 1140,
    tier: 2,
    overdueDays: 288,
    arrestDate: new Date(Date.UTC(2022, 3, 12)),
  });
  const byLabel = Object.fromEntries(d.lines.map((l) => [l.label, l]));

  it("shows every step of the arithmetic in plain language", () => {
    expect(byLabel["Charged sections"].value).toBe("IPC 325, IPC 323");
    expect(byLabel["Governing section"].value).toBe("IPC 325");
    expect(byLabel["Governing section"].note).toBe("highest maximum of those charged");
    expect(byLabel["Maximum sentence"].value).toBe("7 years  =  2,555 days");
    expect(byLabel["Prior conviction"].note).toBe("applicable fraction = 1/3");
    expect(byLabel["Applicable threshold"].value).toBe("2,555  x  1/3  =  852 days");
    expect(byLabel["Days in custody"].value).toBe("1,140");
    expect(byLabel["Days in custody"].note).toBe("arrested 12-04-2022, continuous");
  });

  it("states the comparison and verdict", () => {
    expect(d.comparison).toEqual({ operator: ">=", left: "1,140", right: "852" });
    expect(d.verdict).toBe("TIER 2 ELIGIBLE,  288 days overdue");
  });

  it("does not show the ordering comparison before the 1/2 mark is crossed", () => {
    expect(d.orderingCheck).toBeNull();
  });
});

describe("fractionOrderingCheck — v4 Flaw #20 on screen", () => {
  it("reproduces the demo line: 548 days overdue correctly vs 122 under the wrong order", () => {
    expect(fractionOrderingCheck(2555, 1 / 3, 1400)).toEqual({
      wrongThresholdDays: 1278,
      wrongOverdueDays: 122,
      correctOverdueDays: 548,
      understatedBy: 426,
    });
  });

  it("is not shown for someone already on the 1/2 fraction", () => {
    expect(fractionOrderingCheck(2555, 1 / 2, 1400)).toBeNull();
  });
});

describe("explainDecision — edge categories", () => {
  it("explains a fine-only offence without a fake threshold", () => {
    const d = explainDecision({
      chargedSections: [{ law: "IPC", code: "290", maxSentenceDays: 0, isDeathOrLife: false, isFineOnly: true }],
      governingSection: { law: "IPC", code: "290", maxSentenceDays: 0, isDeathOrLife: false, isFineOnly: true },
      applicableFraction: 1 / 3,
      thresholdDays: 0,
      daysInCustody: 40,
      tier: 1,
      overdueDays: 40,
      arrestDate: new Date(Date.UTC(2026, 0, 1)),
    });
    expect(d.lines.find((l) => l.label === "Maximum sentence")!.value).toMatch(/fine only/);
    expect(d.verdict).toMatch(/carries no imprisonment/);
    expect(d.orderingCheck).toBeNull();
  });

  it("says so when a graded section's conservative maximum was used", () => {
    const d = explainDecision({
      chargedSections: [{ law: "IPC", code: "392", maxSentenceDays: 5110, isDeathOrLife: false, isGraded: true, gradedBand: null }],
      governingSection: { law: "IPC", code: "392", maxSentenceDays: 5110, isDeathOrLife: false, isGraded: true, gradedBand: null },
      applicableFraction: 1 / 2,
      thresholdDays: 2555,
      daysInCustody: 1000,
      tier: null,
      overdueDays: null,
      arrestDate: new Date(Date.UTC(2023, 0, 1)),
    });
    expect(d.gradedNote).toMatch(/conservative \(higher\) maximum/);
    expect(d.verdict).toBe("NOT YET ELIGIBLE — 1,555 days to go");
  });

  it("labels a proxy arrest date honestly", () => {
    const d = explainDecision({
      chargedSections: [IPC_325],
      governingSection: IPC_325,
      applicableFraction: 1 / 2,
      thresholdDays: 1278,
      daysInCustody: 1300,
      tier: 2,
      overdueDays: 22,
      arrestDate: new Date(Date.UTC(2022, 0, 5)),
      arrestDateIsProxy: true,
    });
    expect(d.lines.find((l) => l.label === "Days in custody")!.note).toMatch(/^earliest recorded date/);
  });

  it("says custody was counted to a dataset snapshot, not to today", () => {
    const d = explainDecision({
      chargedSections: [IPC_325],
      governingSection: IPC_325,
      applicableFraction: 1 / 2,
      thresholdDays: 1278,
      daysInCustody: 1300,
      tier: 2,
      overdueDays: 22,
      arrestDate: new Date(Date.UTC(2015, 0, 5)),
      arrestDateIsProxy: true,
      custodyAsOf: new Date(Date.UTC(2018, 7, 1)),
    });
    expect(d.lines.find((l) => l.label === "Days in custody")!.note).toBe(
      "earliest recorded date 05-01-2015, continuous, counted to dataset snapshot 01-08-2018"
    );
  });
});

describe("describeTerm", () => {
  it("uses years, months, or days as appropriate", () => {
    expect(describeTerm(2555)).toBe("7 years");
    expect(describeTerm(365)).toBe("1 year");
    expect(describeTerm(90)).toBe("3 months");
    expect(describeTerm(30)).toBe("1 month");
  });
});
