import { describe, expect, it } from "vitest";
import { normalizeSectionText } from "./sectionLookup";

describe("normalizeSectionText", () => {
  it.each([
    ["IPC 325", "IPC_325"],
    ["ipc 498A", "IPC_498A"],
    ["IPC 304B", "IPC_304B"],
    ["BNS 117(2)", "BNS_117_2"],
    ["BNS 125(b)", "BNS_125_B"],
    ["NDPS 21(b)", "NDPS_21_B"],
    ["IPC Section 420", "IPC_420"],
    ["ARMS 25(1B)(a)", "ARMS_25_1B_A"],
    ["TNPA 4(1)(a)", "TNPA_4_1_A"],
  ])("%s -> %s", (raw, id) => {
    expect(normalizeSectionText(raw)).toBe(id);
  });

  it("never guesses a shape it does not recognise", () => {
    expect(normalizeSectionText("Section 325")).toBeNull();
    expect(normalizeSectionText("IPC 506 Part I")).toBeNull();
  });
});
