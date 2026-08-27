import { describe, expect, it } from "vitest";
import { checkSuretyFailure } from "./trackB";
import type { CaseInput } from "./types";

const baseCase: CaseInput = {
  id: "c1",
  arrestDate: new Date("2023-01-01"),
  chargedSectionIds: ["IPC_325"],
  priorConvictions: false,
  isJuvenile: false,
  pendingCaseFlag: "none",
  specialActFlag: false,
  custodyStatus: "in_custody",
  bailGranted: true,
  bailOrderDate: null,
};

describe("checkSuretyFailure — Track B", () => {
  it("flags when bail granted, still in custody, 7+ days since order", () => {
    const bailOrderDate = new Date();
    bailOrderDate.setDate(bailOrderDate.getDate() - 10);
    const result = checkSuretyFailure({ ...baseCase, bailOrderDate });
    expect(result.status).toBe("flagged");
    expect(result.daysSinceBail).toBe(10);
  });

  it("does not flag within the 7-day grace window", () => {
    const bailOrderDate = new Date();
    bailOrderDate.setDate(bailOrderDate.getDate() - 3);
    const result = checkSuretyFailure({ ...baseCase, bailOrderDate });
    expect(result.status).toBe("clear");
  });

  it("does not flag if already released", () => {
    const bailOrderDate = new Date();
    bailOrderDate.setDate(bailOrderDate.getDate() - 30);
    const result = checkSuretyFailure({
      ...baseCase,
      bailOrderDate,
      custodyStatus: "released",
    });
    expect(result.status).toBe("clear");
  });

  it("is clear (not flagged) when bail was never granted", () => {
    const result = checkSuretyFailure({ ...baseCase, bailGranted: false, bailOrderDate: null });
    expect(result.status).toBe("clear");
  });

  it("routes a missing bail-order date to data-quality review, never silently drops it (v4 Flaw #22)", () => {
    const result = checkSuretyFailure({ ...baseCase, bailGranted: true, bailOrderDate: null });
    expect(result.status).toBe("data_quality_review");
    expect(result.daysSinceBail).toBeNull();
  });
});
