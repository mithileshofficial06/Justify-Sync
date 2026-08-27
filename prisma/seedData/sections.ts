/**
 * Starter IPC/BNS section-to-max-sentence knowledge base (v4 §3 / v5 Stage 0).
 *
 * IMPORTANT: this is a small, hand-entered starting set for development and
 * demo purposes only — NOT yet verified against the Bare Act section-by-section,
 * and NOT complete. Before this is used against any real case:
 *   1. Every entry must be checked against the current Bare Act text (IPC 1860 /
 *      BNS 2023) and given a real `citation`.
 *   2. Graded offences (marked isGraded: true) need their fact-dependent bands
 *      modelled explicitly — right now maxSentenceDays holds only the highest band,
 *      which is NOT safe to use for a case that actually falls in a lower band.
 *   3. BNS section numbers are only included where the source spec itself
 *      states the IPC->BNS mapping (e.g. IPC 325 ~ BNS 117(2)); do not add more
 *      BNS entries without checking the actual renumbering table.
 *
 * version: "0.1.0-unverified"
 */
export interface SeedSection {
  id: string;
  code: string;
  law: "IPC" | "BNS" | "NDPS";
  maxSentenceDays: number;
  isDeathOrLife: boolean;
  isGraded: boolean;
  version: string;
  citation: string | null;
  notes: string | null;
}

const YEAR_DAYS = 365;

export const sections: SeedSection[] = [
  {
    id: "IPC_302",
    code: "302",
    law: "IPC",
    maxSentenceDays: 0,
    isDeathOrLife: true,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Murder — death or life imprisonment. Excluded outright under §479's own statutory carve-out; maxSentenceDays unused when isDeathOrLife is true.",
  },
  {
    id: "IPC_304_PART_I",
    code: "304-I",
    law: "IPC",
    maxSentenceDays: 0,
    isDeathOrLife: true,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Culpable homicide not amounting to murder, Part I (intent) — life imprisonment or up to 10 years. Graded by fact (Part I vs Part II) — do not use without confirming which part applies.",
  },
  {
    id: "IPC_304_PART_II",
    code: "304-II",
    law: "IPC",
    maxSentenceDays: 10 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Culpable homicide not amounting to murder, Part II (knowledge, no intent) — up to 10 years.",
  },
  {
    id: "IPC_307",
    code: "307",
    law: "IPC",
    maxSentenceDays: 10 * YEAR_DAYS,
    isDeathOrLife: true,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Attempt to murder — up to life imprisonment, or up to 10 years depending on facts (hurt caused). isDeathOrLife true since life imprisonment is a possible sentence.",
  },
  {
    id: "IPC_323",
    code: "323",
    law: "IPC",
    maxSentenceDays: 1 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Voluntarily causing hurt — up to 1 year or fine or both.",
  },
  {
    id: "IPC_324",
    code: "324",
    law: "IPC",
    maxSentenceDays: 3 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Voluntarily causing hurt by dangerous weapons or means — up to 3 years.",
  },
  {
    id: "IPC_325",
    code: "325",
    law: "IPC",
    maxSentenceDays: 7 * YEAR_DAYS, // = 2555 days, matches the spec's own worked example
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Voluntarily causing grievous hurt — up to 7 years. Used as the worked example in v4 §3. Approximately equivalent to BNS 117(2) per the source spec.",
  },
  {
    id: "BNS_117_2",
    code: "117(2)",
    law: "BNS",
    maxSentenceDays: 7 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "BNS equivalent of IPC 325 (grievous hurt), per the mapping stated in the v5 source spec. Verify directly against the BNS Bare Act before relying on this.",
  },
  {
    id: "IPC_379",
    code: "379",
    law: "IPC",
    maxSentenceDays: 3 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Theft — up to 3 years or fine or both.",
  },
  {
    id: "IPC_380",
    code: "380",
    law: "IPC",
    maxSentenceDays: 7 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Theft in a dwelling house etc. — up to 7 years.",
  },
  {
    id: "IPC_392",
    code: "392",
    law: "IPC",
    maxSentenceDays: 10 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Robbery — up to 10 years.",
  },
  {
    id: "IPC_411",
    code: "411",
    law: "IPC",
    maxSentenceDays: 3 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Dishonestly receiving stolen property — up to 3 years.",
  },
  {
    id: "IPC_420",
    code: "420",
    law: "IPC",
    maxSentenceDays: 7 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Cheating and dishonestly inducing delivery of property — up to 7 years.",
  },
  {
    id: "IPC_447",
    code: "447",
    law: "IPC",
    maxSentenceDays: 3 * 30, // ~3 months
    isDeathOrLife: false,
    isGraded: false,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Criminal trespass — up to 3 months or fine or both.",
  },
  {
    id: "IPC_506_PART_I",
    code: "506-I",
    law: "IPC",
    maxSentenceDays: 2 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Criminal intimidation, ordinary — up to 2 years. Graded: threat of death/grievous hurt carries up to 7 years instead (see IPC_506_PART_II).",
  },
  {
    id: "IPC_506_PART_II",
    code: "506-II",
    law: "IPC",
    maxSentenceDays: 7 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "Criminal intimidation with threat of death, grievous hurt, or similar — up to 7 years.",
  },
  {
    id: "NDPS_21",
    code: "21",
    law: "NDPS",
    maxSentenceDays: 10 * YEAR_DAYS,
    isDeathOrLife: false,
    isGraded: true,
    version: "0.1.0-unverified",
    citation: null,
    notes: "NDPS Act §21 (possession of manufactured drugs/preparations) — punishment is heavily graded by quantity (small/intermediate/commercial); this entry uses the intermediate-quantity band (rigorous imprisonment up to 10 years) as a placeholder only. A real deployment needs the quantity threshold modelled explicitly, not a single flat value. NDPS/UAPA/PMLA/POCSO/MCOCA cases are routed to stricter-scrutiny review regardless (v4 Flaw #17), never auto-excluded — this section entry exists so Track A can still compute a threshold for the ranking shown in that review queue.",
  },
];
