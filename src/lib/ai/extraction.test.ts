import { describe, expect, it } from "vitest";
import { isHedgedBooleanClaim, quotesFullSentence } from "./extraction";

/**
 * These pin down the exact bug found via live testing against a real
 * synthetic charge sheet: a model can quote a genuinely complete sentence
 * (passing grounding) and still assign a confident true/false that
 * contradicts a hedge clause embedded within that same sentence. Fixed in
 * extraction.ts; tested here as pure logic so it doesn't need a live AI
 * call (slow, flaky, costs real API credits) to catch a regression.
 */
describe("isHedgedBooleanClaim — the exact bug found via live testing", () => {
  it("rejects a boolean fact whose full quoted sentence contains a hedge clause", () => {
    const fact = {
      fieldName: "priorConvictions" as const,
      value: "false",
      sourceSentence:
        "Local police records at this station do not reflect any conviction against the accused; however, as the accused's declared native place falls outside this jurisdiction, a character and antecedents verification report from the concerned police station is still awaited and has not been received as of the date of this report.",
    };
    expect(isHedgedBooleanClaim(fact)).toBe(true);
  });

  it("accepts a clean, unqualified boolean fact", () => {
    const fact = {
      fieldName: "priorConvictions" as const,
      value: "false",
      sourceSentence: "On verification of records, the accused has no previous conviction recorded against him.",
    };
    expect(isHedgedBooleanClaim(fact)).toBe(false);
  });

  it("does not apply to non-boolean fields (e.g. free-text values)", () => {
    const fact = {
      fieldName: "chargedSections" as const,
      value: "IPC 325",
      sourceSentence: "Charged, however, under Section 325, pending further review.",
    };
    expect(isHedgedBooleanClaim(fact)).toBe(false);
  });

  it("does NOT reject legitimate legal phrasing that happens to contain the word 'pending' — live-verified false positive", () => {
    // "pending" was originally in the hedge word list, and rejected this
    // exact real sentence from a synthetic charge sheet, breaking
    // otherPendingCases extraction 100% of the time (3/3 live runs) even
    // though the model correctly extracted it every time. "case ... is
    // pending" is a status being asserted, not a hedge about confidence.
    const fact = {
      fieldName: "otherPendingCases" as const,
      value: "false",
      sourceSentence: "On enquiry, no other case is presently pending against the accused before any Court.",
    };
    expect(isHedgedBooleanClaim(fact)).toBe(false);
  });
});

describe("quotesFullSentence — rejects truncated-clause grounding", () => {
  const doc =
    "Local police records at this station do not reflect any conviction against the accused; however, verification is pending.";

  it("rejects a quote that stops right before a semicolon continuation", () => {
    const truncated = "Local police records at this station do not reflect any conviction against the accused";
    expect(quotesFullSentence(doc, truncated)).toBe(false);
  });

  it("accepts a quote that runs to the real sentence end", () => {
    expect(quotesFullSentence(doc, doc)).toBe(true);
  });
});
