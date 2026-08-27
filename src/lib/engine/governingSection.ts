import type { Section } from "./types";

/**
 * v5 Stage 5: if multiple sections are charged, the governing section is
 * whichever carries the highest maximum sentence — a fixed rule, not AI.
 */
export function getGoverningSection(
  chargedSectionIds: string[],
  knowledgeBase: Map<string, Section>
): Section {
  if (chargedSectionIds.length === 0) {
    throw new Error("Cannot determine governing section: no charged sections given.");
  }

  const sections = chargedSectionIds.map((id) => {
    const section = knowledgeBase.get(id);
    if (!section) {
      throw new Error(`Unknown section "${id}" — not present in the knowledge base.`);
    }
    return section;
  });

  return sections.reduce((highest, current) =>
    current.maxSentenceDays > highest.maxSentenceDays ? current : highest
  );
}
