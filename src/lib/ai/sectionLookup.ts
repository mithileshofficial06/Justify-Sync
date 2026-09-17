/**
 * Best-effort normalizer from extracted text like "IPC 325", "IPC 498A",
 * "BNS 117(2)" or "ARMS 25(1B)(a)" to knowledge base ids like "IPC_325" /
 * "IPC_498A" / "BNS_117_2" / "ARMS_25_1B_A". Deliberately narrow — it only
 * handles "LAW NUMBER[LETTER]" followed by up to two "(sub)" groups.
 * A graded section without an explicit part (e.g. "IPC 506") resolves to the
 * KB's band-not-established row, which the engine treats conservatively; a
 * part is never guessed. Anything else returns null and routes to review.
 */
export function normalizeSectionText(raw: string): string | null {
  const match = raw
    .trim()
    .toUpperCase()
    .match(/^(IPC|BNS|NDPS|ARMS|TNPA)\s*(?:SECTION\s*|S\.\s*)?(\d+[A-Z]?)((?:\s*\([0-9A-Z]+\)){0,2})$/);
  if (!match) return null;

  const [, law, code, subs] = match;
  const parts = [...subs.matchAll(/\(([0-9A-Z]+)\)/g)].map((m) => m[1]);
  return [law, code, ...parts].join("_");
}
