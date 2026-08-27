/**
 * Best-effort normalizer from extracted text like "IPC 325" or "BNS 117(2)"
 * to knowledge base ids like "IPC_325" / "BNS_117_2". Deliberately narrow —
 * it only handles the plain "LAW NUMBER" and "LAW NUMBER(SUBSECTION)"
 * shapes. Graded sections (e.g. "IPC 506 Part I") are NOT guessed here;
 * an unresolved section returns null and routes to human review rather
 * than risk picking the wrong band of a graded offence.
 */
export function normalizeSectionText(raw: string): string | null {
  const match = raw.trim().toUpperCase().match(/^(IPC|BNS|NDPS)\s*(\d+)(?:\((\d+)\))?$/);
  if (!match) return null;

  const [, law, code, subsection] = match;
  return subsection ? `${law}_${code}_${subsection}` : `${law}_${code}`;
}
