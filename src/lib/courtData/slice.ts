import { normalizeSectionText } from "@/lib/ai/sectionLookup";

/**
 * Maps a district slice of public court metadata (eCourts / Development Data
 * Lab) into cases the engine can compute. Canonical CSV, one row per charged
 * section:
 *
 *   case_ref, act, section, filing_date, decision_date, arrest_date, snapshot_date
 *
 * arrest_date is usually absent from court metadata; filing_date is then used
 * as the earliest available proxy and the case is labelled as approximate.
 * snapshot_date is when the metadata was extracted — custody is counted to it,
 * because a snapshot cannot tell us who is still inside today.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export function toRecords(rows: string[][]): Record<string, string>[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return validUtc(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return validUtc(+m[3], +m[2], +m[1]);
  return null;
}

function validUtc(y: number, mo: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

const ACT_PATTERNS: [RegExp, string][] = [
  [/^ipc$|indian penal code/i, "IPC"],
  [/^bns$|bharatiya nyaya sanhita/i, "BNS"],
  [/^ndps$|narcotic drugs/i, "NDPS"],
  [/^arms$|arms act/i, "ARMS"],
  [/^tnpa$|tamil nadu prohibition/i, "TNPA"],
];

export function lawFromAct(act: string): string | null {
  const a = act.trim();
  return ACT_PATTERNS.find(([re]) => re.test(a))?.[1] ?? null;
}

/** "379", "Sec. 379", "379 IPC", "25(1B)(a)" -> KB id for that act, or null. */
export function sectionIdFor(act: string, section: string): string | null {
  const law = lawFromAct(act);
  if (!law) return null;
  const code = section.replace(/\b(sec(tion)?|s|u\/s|ipc|bns)\b\.?/gi, "").trim().match(/^\d+[A-Za-z]?(?:\s*\([0-9A-Za-z]+\)){0,2}/)?.[0];
  if (!code) return null;
  return normalizeSectionText(`${law} ${code.replace(/\s+/g, "")}`);
}

export interface SliceCase {
  caseRef: string;
  sectionIds: string[];
  sectionLabels: string[];
  arrestDate: Date;
  arrestDateIsProxy: boolean;
  snapshotDate: Date;
}

export type SkipReason = "disposed" | "section_not_in_kb" | "missing_date" | "future_date";

export interface SliceResult {
  cases: SliceCase[];
  skipped: Record<SkipReason, number>;
  /** Unmatched section labels and how many cases each blocked — the case for expanding the knowledge base. */
  unmatchedSections: Map<string, number>;
  totalCases: number;
}

export function mapSlice(records: Record<string, string>[], kbIds: Set<string>, defaultSnapshot?: Date): SliceResult {
  const byCase = new Map<string, Record<string, string>[]>();
  for (const r of records) {
    const ref = r.case_ref;
    if (!ref) continue;
    byCase.set(ref, [...(byCase.get(ref) ?? []), r]);
  }

  const skipped: Record<SkipReason, number> = { disposed: 0, section_not_in_kb: 0, missing_date: 0, future_date: 0 };
  const unmatchedSections = new Map<string, number>();
  const cases: SliceCase[] = [];

  for (const [caseRef, rows] of byCase) {
    const first = rows[0];
    if (parseDate(first.decision_date ?? "")) {
      skipped.disposed++;
      continue;
    }

    const snapshotDate = parseDate(first.snapshot_date ?? "") ?? defaultSnapshot ?? null;
    const arrest = parseDate(first.arrest_date ?? "");
    const filing = parseDate(first.filing_date ?? "");
    const start = arrest ?? filing;
    if (!start || !snapshotDate) {
      skipped.missing_date++;
      continue;
    }
    if (start > snapshotDate) {
      skipped.future_date++;
      continue;
    }

    const labels = rows.map((r) => `${lawFromAct(r.act ?? "") ?? (r.act || "?")} ${r.section}`.trim());
    const ids = rows.map((r) => sectionIdFor(r.act ?? "", r.section ?? ""));
    // Every charged section must be known: an unknown one could carry the
    // highest maximum and change the governing section, so partial is unsafe.
    const missing = ids.map((id, i) => (id && kbIds.has(id) ? null : labels[i])).filter((l): l is string => l !== null);
    if (missing.length > 0) {
      skipped.section_not_in_kb++;
      for (const l of new Set(missing)) unmatchedSections.set(l, (unmatchedSections.get(l) ?? 0) + 1);
      continue;
    }

    cases.push({
      caseRef,
      sectionIds: [...new Set(ids as string[])],
      sectionLabels: [...new Set(labels)],
      arrestDate: start,
      arrestDateIsProxy: !arrest,
      snapshotDate,
    });
  }

  return { cases, skipped, unmatchedSections, totalCases: byCase.size };
}
