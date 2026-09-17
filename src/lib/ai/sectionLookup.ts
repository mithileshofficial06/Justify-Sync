/**
 * Best-effort normalizer from extracted text like "IPC 325", "IPC 498A" or
 * "BNS 117(2)" to knowledge base ids like "IPC_325" / "IPC_498A" / "BNS_117_2".
 * Deliberately narrow — it only handles "LAW NUMBER[LETTER][(SUBSECTION)]".
 * A graded section without an explicit part (e.g. "IPC 506") resolves to the
 * KB's band-not-established row, which the engine treats conservatively; a
 * part is never guessed. Anything else returns null and routes to review.
 */
export function normalizeSectionText(raw: string): string | null {
  const match = raw
    .trim()
    .toUpperCase()
    .match(/^(IPC|BNS|NDPS)\s*(?:SECTION\s*|S\.\s*)?(\d+[A-Z]?)(?:\s*\(([0-9A-Z]+)\))?$/);
  if (!match) return null;

  const [, law, code, subsection] = match;
  return subsection ? `${law}_${code}_${subsection}` : `${law}_${code}`;
}
