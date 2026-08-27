import { describe, expect, it } from "vitest";
import { nameSimilarity, findPotentialMatches, type CandidatePerson } from "./entityResolution";

describe("nameSimilarity — Jaro-Winkler", () => {
  it("scores identical names as 1", () => {
    expect(nameSimilarity("Mohammad Khan", "Mohammad Khan")).toBe(1);
  });

  it("scores common transliteration variants highly (v4 Flaw #18's own example)", () => {
    expect(nameSimilarity("Mohd Khan", "Mohammad Khan")).toBeGreaterThan(0.82);
    expect(nameSimilarity("Muhammad Khan", "Mohammad Khan")).toBeGreaterThan(0.82);
  });

  it("scores unrelated names low", () => {
    expect(nameSimilarity("Karthikeyan Murugesan", "Ezhilarasan Chandran")).toBeLessThan(0.7);
  });
});

describe("findPotentialMatches", () => {
  const target: CandidatePerson = { id: "target", nameVariants: ["Mohd Aslam"], approxAge: 30 };

  it("finds a likely match with a transliteration variant and close age", () => {
    const candidates: CandidatePerson[] = [
      { id: "a", nameVariants: ["Mohammad Aslam"], approxAge: 31 },
      { id: "b", nameVariants: ["Selvam Raja"], approxAge: 29 },
    ];
    const matches = findPotentialMatches(target, candidates);
    expect(matches.map((m) => m.personId)).toContain("a");
    expect(matches.map((m) => m.personId)).not.toContain("b");
  });

  it("excludes a name match if the age gap is too large — same name, clearly different people", () => {
    const candidates: CandidatePerson[] = [{ id: "c", nameVariants: ["Mohd Aslam"], approxAge: 65 }];
    expect(findPotentialMatches(target, candidates)).toHaveLength(0);
  });

  it("never returns the target itself even if somehow present in the candidate list", () => {
    const candidates: CandidatePerson[] = [target];
    expect(findPotentialMatches(target, candidates)).toHaveLength(0);
  });

  it("sorts best match first", () => {
    const candidates: CandidatePerson[] = [
      { id: "close", nameVariants: ["Mohd Aslam"], approxAge: 30 },
      { id: "looser", nameVariants: ["Mohammed Aslamm"], approxAge: 30 },
    ];
    const matches = findPotentialMatches(target, candidates);
    expect(matches[0].personId).toBe("close");
  });
});
