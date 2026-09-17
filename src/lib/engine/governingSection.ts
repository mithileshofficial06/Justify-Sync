import type { Section } from "./types";

/**
 * v5 Stage 5: if multiple sections are charged, the governing section is
 * whichever carries the highest maximum sentence — a fixed rule, not AI.
 * A death/life-eligible section always governs: its maxSentenceDays is not a
 * term of years, so comparing raw day counts would let e.g. IPC 323 (365
 * days) outrank IPC 302 and silently skip the §479 carve-out.
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

  const severity = (s: Section) => (s.isDeathOrLife ? Number.POSITIVE_INFINITY : s.maxSentenceDays);
  return sections.reduce((highest, current) => (severity(current) > severity(highest) ? current : highest));
}
