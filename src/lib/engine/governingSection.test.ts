import { describe, expect, it } from "vitest";
import { getGoverningSection } from "./governingSection";
import type { Section } from "./types";

const kb = new Map<string, Section>([
  ["IPC_302", { id: "IPC_302", code: "302", law: "IPC", maxSentenceDays: 0, isDeathOrLife: true }],
  ["IPC_323", { id: "IPC_323", code: "323", law: "IPC", maxSentenceDays: 365, isDeathOrLife: false }],
  ["IPC_325", { id: "IPC_325", code: "325", law: "IPC", maxSentenceDays: 2555, isDeathOrLife: false }],
  ["IPC_290", { id: "IPC_290", code: "290", law: "IPC", maxSentenceDays: 0, isDeathOrLife: false, isFineOnly: true }],
]);

describe("getGoverningSection", () => {
  it("picks the highest maximum sentence among those charged", () => {
    expect(getGoverningSection(["IPC_323", "IPC_325"], kb).id).toBe("IPC_325");
  });

  it("always lets a death/life section govern, even though its day count is not a term of years", () => {
    expect(getGoverningSection(["IPC_323", "IPC_302"], kb).id).toBe("IPC_302");
  });

  it("does not let a fine-only section govern over an imprisonable one", () => {
    expect(getGoverningSection(["IPC_290", "IPC_323"], kb).id).toBe("IPC_323");
  });

  it("rejects a section missing from the knowledge base", () => {
    expect(() => getGoverningSection(["IPC_999"], kb)).toThrow(/not present in the knowledge base/);
  });
});
