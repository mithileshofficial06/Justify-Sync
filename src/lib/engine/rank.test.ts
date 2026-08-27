import { describe, expect, it } from "vitest";
import { rankCases } from "./rank";

describe("rankCases", () => {
  it("Tier 1 always ranks above Tier 2, regardless of overdue days", () => {
    const result = rankCases([
      { caseId: "a", tier: 2, overdueDays: 900 },
      { caseId: "b", tier: 1, overdueDays: 5 },
    ]);
    expect(result.map((c) => c.caseId)).toEqual(["b", "a"]);
  });

  it("within a tier, most overdue first", () => {
    const result = rankCases([
      { caseId: "a", tier: 2, overdueDays: 10 },
      { caseId: "b", tier: 2, overdueDays: 500 },
      { caseId: "c", tier: 2, overdueDays: 200 },
    ]);
    expect(result.map((c) => c.caseId)).toEqual(["b", "c", "a"]);
  });
});
