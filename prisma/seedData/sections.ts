/**
 * Statutory knowledge base, version KB-2026.09 (SIH build Module 2).
 *
 * Coverage is chosen from what dominates district undertrial dockets, plus one
 * example of every category the engine must handle: graded punishment
 * (IPC 304 Part I / Part II), state and special acts (TN Prohibition Act, Arms
 * Act, NDPS Act), a fine-only offence (IPC 290 / BNS 292) and death-or-life
 * sections that trigger §479's own carve-out.
 *
 * Sources:
 *  - Maximum punishments: the Bare Acts (IPC 1860, BNS 2023, NDPS Act 1985,
 *    Arms Act 1959 as amended by Act 51 of 2019, TN Prohibition Act 1937).
 *  - IPC -> BNS correspondence: BPRD / CAPT Bhopal "Comparison Summary BNS to
 *    IPC". Where the BNS changed the punishment (e.g. IPC 406 3y -> BNS 316(2)
 *    5y), each code keeps its own maximum — a case is computed under the code it
 *    was actually charged under.
 *
 * Day conversion: 1 year = 365 days, 1 month = 30 days (matches the v4 §3
 * worked example, IPC 325 = 2,555 days).
 *
 * Graded rows: a row with isGraded and a gradedBand is one specific band. A
 * graded row with gradedBand null means "band not established from the record":
 * if no band carries life, the engine uses the conservative (higher) maximum;
 * if a band carries life, the case is routed to human review.
 */
export const KB_VERSION = "KB-2026.09";

export interface SeedSection {
  id: string;
  code: string;
  law: string;
  title: string;
  punishment: string;
  maxSentenceDays: number;
  isDeathOrLife: boolean;
  isGraded: boolean;
  gradedBand: string | null;
  isFineOnly: boolean;
  isSpecialAct: boolean;
  equivalentId: string | null;
  version: string;
  citation: string;
  notes: string | null;
}

const Y = 365;
const M = 30;

const BPRD = "IPC–BNS correspondence per BPRD/CAPT Bhopal comparison summary";

type Row = Pick<SeedSection, "id" | "code" | "law" | "title" | "punishment" | "maxSentenceDays"> &
  Partial<Pick<SeedSection, "isDeathOrLife" | "isGraded" | "gradedBand" | "isFineOnly" | "isSpecialAct" | "notes">> & {
    citation: string;
  };

function row(r: Row, equivalentId: string | null = null): SeedSection {
  return {
    isDeathOrLife: false,
    isGraded: false,
    gradedBand: null,
    isFineOnly: false,
    isSpecialAct: false,
    notes: null,
    ...r,
    equivalentId,
    version: KB_VERSION,
  };
}

/** An IPC section and its BNS successor, linked both ways. */
function pair(ipc: Row, bns: Row): SeedSection[] {
  const mapping = `IPC ${ipc.code} ≈ BNS ${bns.code} (${BPRD}).`;
  const withNote = (r: Row) => ({ ...r, notes: r.notes ? `${mapping} ${r.notes}` : mapping });
  return [row(withNote(ipc), bns.id), row(withNote(bns), ipc.id)];
}

const ipcCite = (s: string) => `Indian Penal Code, 1860, s. ${s}`;
const bnsCite = (s: string) => `Bharatiya Nyaya Sanhita, 2023, s. ${s}`;

export const sections: SeedSection[] = [
  // --- Death or life: §479's statutory carve-out ---
  ...pair(
    { id: "IPC_302", code: "302", law: "IPC", title: "Murder", punishment: "Death, or imprisonment for life, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("302") },
    { id: "BNS_103_1", code: "103(1)", law: "BNS", title: "Murder", punishment: "Death, or imprisonment for life, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("103(1)") }
  ),
  ...pair(
    { id: "IPC_304B", code: "304B", law: "IPC", title: "Dowry death", punishment: "Not less than 7 years, may extend to imprisonment for life", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("304B") },
    { id: "BNS_80", code: "80", law: "BNS", title: "Dowry death", punishment: "Not less than 7 years, may extend to imprisonment for life", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("80(2)") }
  ),
  ...pair(
    { id: "IPC_307", code: "307", law: "IPC", title: "Attempt to murder", punishment: "Up to 10 years and fine; if hurt is caused, imprisonment for life", maxSentenceDays: 10 * Y, isDeathOrLife: true, isGraded: true, citation: ipcCite("307"), notes: "Graded: whether hurt was caused decides whether life imprisonment (and so the §479 carve-out) applies — routed to human review until established." },
    { id: "BNS_109", code: "109", law: "BNS", title: "Attempt to murder", punishment: "Up to 10 years and fine; if hurt is caused, imprisonment for life", maxSentenceDays: 10 * Y, isDeathOrLife: true, isGraded: true, citation: bnsCite("109(1)"), notes: "Graded: routed to human review until it is established whether hurt was caused." }
  ),
  ...pair(
    { id: "IPC_326", code: "326", law: "IPC", title: "Voluntarily causing grievous hurt by dangerous weapons or means", punishment: "Imprisonment for life, or up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("326") },
    { id: "BNS_118_2", code: "118(2)", law: "BNS", title: "Voluntarily causing grievous hurt by dangerous weapons or means", punishment: "Imprisonment for life, or 1 to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("118(2)"), notes: "BNS adds a one-year minimum." }
  ),
  ...pair(
    { id: "IPC_376", code: "376", law: "IPC", title: "Rape", punishment: "Not less than 10 years, may extend to imprisonment for life, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("376(1)") },
    { id: "BNS_64", code: "64", law: "BNS", title: "Rape", punishment: "Not less than 10 years, may extend to imprisonment for life, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("64(1)") }
  ),
  ...pair(
    { id: "IPC_394", code: "394", law: "IPC", title: "Voluntarily causing hurt in committing robbery", punishment: "Imprisonment for life, or rigorous imprisonment up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("394") },
    { id: "BNS_309_6", code: "309(6)", law: "BNS", title: "Voluntarily causing hurt in committing robbery", punishment: "Imprisonment for life, or rigorous imprisonment up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("309(6)") }
  ),
  ...pair(
    { id: "IPC_395", code: "395", law: "IPC", title: "Dacoity", punishment: "Imprisonment for life, or rigorous imprisonment up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("395") },
    { id: "BNS_310_2", code: "310(2)", law: "BNS", title: "Dacoity", punishment: "Imprisonment for life, or rigorous imprisonment up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("310(2)") }
  ),
  ...pair(
    { id: "IPC_409", code: "409", law: "IPC", title: "Criminal breach of trust by public servant, banker, merchant or agent", punishment: "Imprisonment for life, or up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: ipcCite("409") },
    { id: "BNS_316_5", code: "316(5)", law: "BNS", title: "Criminal breach of trust by public servant, banker, merchant or agent", punishment: "Imprisonment for life, or up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, citation: bnsCite("316(5)") }
  ),

  // --- Graded: §304 culpable homicide not amounting to murder ---
  row(
    { id: "IPC_304", code: "304", law: "IPC", title: "Culpable homicide not amounting to murder (part not established)", punishment: "Part I: imprisonment for life, or up to 10 years. Part II: up to 10 years", maxSentenceDays: 10 * Y, isDeathOrLife: true, isGraded: true, gradedBand: null, citation: ipcCite("304"), notes: "Use when the record does not say which part applies. Part I carries life, so the engine routes this to human review rather than excluding or ranking." },
    "BNS_105"
  ),
  row(
    { id: "IPC_304_PART_I", code: "304 Part I", law: "IPC", title: "Culpable homicide not amounting to murder — with intention", punishment: "Imprisonment for life, or up to 10 years, and fine", maxSentenceDays: 0, isDeathOrLife: true, isGraded: true, gradedBand: "Part I (intention)", citation: ipcCite("304, first paragraph") },
    "BNS_105"
  ),
  row(
    { id: "IPC_304_PART_II", code: "304 Part II", law: "IPC", title: "Culpable homicide not amounting to murder — with knowledge, without intention", punishment: "Up to 10 years, or fine, or both", maxSentenceDays: 10 * Y, isGraded: true, gradedBand: "Part II (knowledge)", citation: ipcCite("304, second paragraph") },
    "BNS_105"
  ),
  row(
    { id: "BNS_105", code: "105", law: "BNS", title: "Culpable homicide not amounting to murder (part not established)", punishment: "First part: imprisonment for life, or 5 to 10 years, and fine. Second part: up to 10 years and fine", maxSentenceDays: 10 * Y, isDeathOrLife: true, isGraded: true, gradedBand: null, citation: bnsCite("105"), notes: `IPC 304 ≈ BNS 105 (${BPRD}); BNS adds a five-year minimum to the first part.` },
    "IPC_304"
  ),

  // --- Other graded sections: conservative (higher) maximum when the band is not established ---
  ...pair(
    { id: "IPC_308", code: "308", law: "IPC", title: "Attempt to commit culpable homicide", punishment: "Up to 3 years, or fine, or both; if hurt is caused, up to 7 years", maxSentenceDays: 7 * Y, isGraded: true, citation: ipcCite("308"), notes: "Band not established: 7-year (hurt caused) maximum used." },
    { id: "BNS_110", code: "110", law: "BNS", title: "Attempt to commit culpable homicide", punishment: "Up to 3 years, or fine, or both; if hurt is caused, up to 7 years", maxSentenceDays: 7 * Y, isGraded: true, citation: bnsCite("110"), notes: "Band not established: 7-year (hurt caused) maximum used." }
  ),
  ...pair(
    { id: "IPC_392", code: "392", law: "IPC", title: "Robbery", punishment: "Rigorous imprisonment up to 10 years and fine; up to 14 years if on a highway between sunset and sunrise", maxSentenceDays: 14 * Y, isGraded: true, citation: ipcCite("392"), notes: "Band not established: 14-year (highway at night) maximum used." },
    { id: "BNS_309_4", code: "309(4)", law: "BNS", title: "Robbery", punishment: "Rigorous imprisonment up to 10 years and fine; up to 14 years if on a highway between sunset and sunrise", maxSentenceDays: 14 * Y, isGraded: true, citation: bnsCite("309(4)"), notes: "Band not established: 14-year maximum used." }
  ),
  ...pair(
    { id: "IPC_457", code: "457", law: "IPC", title: "Lurking house-trespass or house-breaking by night to commit an offence punishable with imprisonment", punishment: "Up to 5 years and fine; up to 14 years if the intended offence is theft", maxSentenceDays: 14 * Y, isGraded: true, citation: ipcCite("457"), notes: "Band not established: 14-year (theft intended) maximum used." },
    { id: "BNS_331_4", code: "331(4)", law: "BNS", title: "Lurking house-trespass or house-breaking after sunset to commit an offence punishable with imprisonment", punishment: "Up to 5 years and fine; up to 14 years if the intended offence is theft", maxSentenceDays: 14 * Y, isGraded: true, citation: bnsCite("331(4)"), notes: "Band not established: 14-year maximum used." }
  ),
  ...pair(
    { id: "IPC_506", code: "506", law: "IPC", title: "Criminal intimidation (part not established)", punishment: "Up to 2 years; up to 7 years if the threat is of death, grievous hurt, or similar", maxSentenceDays: 7 * Y, isGraded: true, citation: ipcCite("506"), notes: "Band not established: 7-year maximum used." },
    { id: "BNS_351", code: "351", law: "BNS", title: "Criminal intimidation (part not established)", punishment: "Up to 2 years; up to 7 years if the threat is of death, grievous hurt, or similar", maxSentenceDays: 7 * Y, isGraded: true, citation: bnsCite("351(2)–(3)"), notes: "Band not established: 7-year maximum used." }
  ),
  ...pair(
    { id: "IPC_506_PART_I", code: "506 Part I", law: "IPC", title: "Criminal intimidation", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, isGraded: true, gradedBand: "Part I (ordinary threat)", citation: ipcCite("506, first paragraph") },
    { id: "BNS_351_2", code: "351(2)", law: "BNS", title: "Criminal intimidation", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, isGraded: true, gradedBand: "351(2) (ordinary threat)", citation: bnsCite("351(2)") }
  ),
  ...pair(
    { id: "IPC_506_PART_II", code: "506 Part II", law: "IPC", title: "Criminal intimidation — threat of death, grievous hurt, etc.", punishment: "Up to 7 years, or fine, or both", maxSentenceDays: 7 * Y, isGraded: true, gradedBand: "Part II (threat of death or grievous hurt)", citation: ipcCite("506, second paragraph") },
    { id: "BNS_351_3", code: "351(3)", law: "BNS", title: "Criminal intimidation — threat of death, grievous hurt, etc.", punishment: "Up to 7 years, or fine, or both", maxSentenceDays: 7 * Y, isGraded: true, gradedBand: "351(3) (threat of death or grievous hurt)", citation: bnsCite("351(3)") }
  ),
  row(
    { id: "IPC_188", code: "188", law: "IPC", title: "Disobedience to order duly promulgated by public servant", punishment: "Simple imprisonment up to 1 month, or fine; up to 6 months if it causes danger to life, health or safety", maxSentenceDays: 6 * M, isGraded: true, citation: ipcCite("188"), notes: `Band not established: 6-month maximum used. IPC 188 ≈ BNS 223 (${BPRD}); BNS 223 is not yet in this KB version.` }
  ),

  // --- Hurt, restraint, assault ---
  ...pair(
    { id: "IPC_323", code: "323", law: "IPC", title: "Voluntarily causing hurt", punishment: "Up to 1 year, or fine up to ₹1,000, or both", maxSentenceDays: 1 * Y, citation: ipcCite("323") },
    { id: "BNS_115_2", code: "115(2)", law: "BNS", title: "Voluntarily causing hurt", punishment: "Up to 1 year, or fine up to ₹10,000, or both", maxSentenceDays: 1 * Y, citation: bnsCite("115(2)") }
  ),
  ...pair(
    { id: "IPC_324", code: "324", law: "IPC", title: "Voluntarily causing hurt by dangerous weapons or means", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: ipcCite("324") },
    { id: "BNS_118_1", code: "118(1)", law: "BNS", title: "Voluntarily causing hurt by dangerous weapons or means", punishment: "Up to 3 years, or fine up to ₹20,000, or both", maxSentenceDays: 3 * Y, citation: bnsCite("118(1)") }
  ),
  ...pair(
    { id: "IPC_325", code: "325", law: "IPC", title: "Voluntarily causing grievous hurt", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: ipcCite("325"), notes: "The v4 §3 worked example: 2,555 days, threshold 852 days for a first-time offender." },
    { id: "BNS_117_2", code: "117(2)", law: "BNS", title: "Voluntarily causing grievous hurt", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: bnsCite("117(2)") }
  ),
  ...pair(
    { id: "IPC_338", code: "338", law: "IPC", title: "Causing grievous hurt by act endangering life or personal safety of others", punishment: "Up to 2 years, or fine up to ₹1,000, or both", maxSentenceDays: 2 * Y, citation: ipcCite("338") },
    { id: "BNS_125_B", code: "125(b)", law: "BNS", title: "Act endangering life or personal safety — grievous hurt caused", punishment: "Up to 3 years, or fine up to ₹10,000, or both", maxSentenceDays: 3 * Y, citation: bnsCite("125(b)"), notes: "BNS raises the maximum from 2 to 3 years." }
  ),
  ...pair(
    { id: "IPC_341", code: "341", law: "IPC", title: "Wrongful restraint", punishment: "Simple imprisonment up to 1 month, or fine up to ₹500, or both", maxSentenceDays: 1 * M, citation: ipcCite("341") },
    { id: "BNS_126_2", code: "126(2)", law: "BNS", title: "Wrongful restraint", punishment: "Simple imprisonment up to 1 month, or fine up to ₹5,000, or both", maxSentenceDays: 1 * M, citation: bnsCite("126(2)") }
  ),
  ...pair(
    { id: "IPC_342", code: "342", law: "IPC", title: "Wrongful confinement", punishment: "Up to 1 year, or fine up to ₹1,000, or both", maxSentenceDays: 1 * Y, citation: ipcCite("342") },
    { id: "BNS_127_2", code: "127(2)", law: "BNS", title: "Wrongful confinement", punishment: "Up to 1 year, or fine up to ₹5,000, or both", maxSentenceDays: 1 * Y, citation: bnsCite("127(2)") }
  ),
  ...pair(
    { id: "IPC_353", code: "353", law: "IPC", title: "Assault or criminal force to deter public servant from discharge of duty", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, citation: ipcCite("353") },
    { id: "BNS_132", code: "132", law: "BNS", title: "Assault or criminal force to deter public servant from discharge of duty", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, citation: bnsCite("132") }
  ),
  ...pair(
    { id: "IPC_354", code: "354", law: "IPC", title: "Assault or criminal force to woman with intent to outrage her modesty", punishment: "1 to 5 years and fine", maxSentenceDays: 5 * Y, citation: ipcCite("354") },
    { id: "BNS_74", code: "74", law: "BNS", title: "Assault or criminal force to woman with intent to outrage her modesty", punishment: "1 to 5 years and fine", maxSentenceDays: 5 * Y, citation: bnsCite("74") }
  ),
  ...pair(
    { id: "IPC_363", code: "363", law: "IPC", title: "Kidnapping", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: ipcCite("363") },
    { id: "BNS_137_2", code: "137(2)", law: "BNS", title: "Kidnapping", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: bnsCite("137(2)") }
  ),
  ...pair(
    { id: "IPC_498A", code: "498A", law: "IPC", title: "Cruelty by husband or relatives of husband", punishment: "Up to 3 years and fine", maxSentenceDays: 3 * Y, citation: ipcCite("498A") },
    { id: "BNS_85", code: "85", law: "BNS", title: "Cruelty by husband or relatives of husband", punishment: "Up to 3 years and fine", maxSentenceDays: 3 * Y, citation: bnsCite("85"), notes: "IPC 498A is split into BNS 85 (offence) and 86 (definition)." }
  ),
  ...pair(
    { id: "IPC_509", code: "509", law: "IPC", title: "Word, gesture or act intended to insult the modesty of a woman", punishment: "Simple imprisonment up to 3 years and fine", maxSentenceDays: 3 * Y, citation: ipcCite("509") },
    { id: "BNS_79", code: "79", law: "BNS", title: "Word, gesture or act intended to insult the modesty of a woman", punishment: "Simple imprisonment up to 3 years and fine", maxSentenceDays: 3 * Y, citation: bnsCite("79") }
  ),

  // --- Negligence, public order ---
  ...pair(
    { id: "IPC_279", code: "279", law: "IPC", title: "Rash driving or riding on a public way", punishment: "Up to 6 months, or fine up to ₹1,000, or both", maxSentenceDays: 6 * M, citation: ipcCite("279") },
    { id: "BNS_281", code: "281", law: "BNS", title: "Rash driving or riding on a public way", punishment: "Up to 6 months, or fine up to ₹1,000, or both", maxSentenceDays: 6 * M, citation: bnsCite("281") }
  ),
  ...pair(
    { id: "IPC_304A", code: "304A", law: "IPC", title: "Causing death by negligence", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, citation: ipcCite("304A") },
    { id: "BNS_106_1", code: "106(1)", law: "BNS", title: "Causing death by negligence", punishment: "Up to 5 years and fine", maxSentenceDays: 5 * Y, citation: bnsCite("106(1)"), notes: "BNS raises the maximum from 2 to 5 years." }
  ),
  ...pair(
    { id: "IPC_294", code: "294", law: "IPC", title: "Obscene acts and songs", punishment: "Up to 3 months, or fine, or both", maxSentenceDays: 3 * M, citation: ipcCite("294") },
    { id: "BNS_296", code: "296", law: "BNS", title: "Obscene acts and songs", punishment: "Up to 3 months, or fine up to ₹1,000, or both", maxSentenceDays: 3 * M, citation: bnsCite("296") }
  ),

  // --- Fine only: no custodial maximum at all ---
  ...pair(
    { id: "IPC_290", code: "290", law: "IPC", title: "Public nuisance in cases not otherwise provided for", punishment: "Fine up to ₹200 — no imprisonment", maxSentenceDays: 0, isFineOnly: true, citation: ipcCite("290"), notes: "Fine-only: any day in custody already exceeds the maximum punishment." },
    { id: "BNS_292", code: "292", law: "BNS", title: "Public nuisance in cases not otherwise provided for", punishment: "Fine up to ₹1,000 — no imprisonment", maxSentenceDays: 0, isFineOnly: true, citation: bnsCite("292"), notes: "Fine-only." }
  ),

  // --- Property offences ---
  ...pair(
    { id: "IPC_379", code: "379", law: "IPC", title: "Theft", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: ipcCite("379") },
    { id: "BNS_303_2", code: "303(2)", law: "BNS", title: "Theft", punishment: "Up to 3 years, or fine, or both; 1 to 5 years on second or subsequent conviction", maxSentenceDays: 5 * Y, isGraded: true, citation: bnsCite("303(2)"), notes: "Graded by conviction history — band not established, so the 5-year repeat-offence maximum is used." }
  ),
  ...pair(
    { id: "IPC_380", code: "380", law: "IPC", title: "Theft in dwelling house, etc.", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: ipcCite("380") },
    { id: "BNS_305", code: "305", law: "BNS", title: "Theft in a dwelling house, means of transportation or place of worship", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: bnsCite("305") }
  ),
  ...pair(
    { id: "IPC_382", code: "382", law: "IPC", title: "Theft after preparation made for causing death, hurt or restraint", punishment: "Rigorous imprisonment up to 10 years and fine", maxSentenceDays: 10 * Y, citation: ipcCite("382") },
    { id: "BNS_307", code: "307", law: "BNS", title: "Theft after preparation made for causing death, hurt or restraint", punishment: "Rigorous imprisonment up to 10 years and fine", maxSentenceDays: 10 * Y, citation: bnsCite("307") }
  ),
  ...pair(
    { id: "IPC_384", code: "384", law: "IPC", title: "Extortion", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: ipcCite("384") },
    { id: "BNS_308_2", code: "308(2)", law: "BNS", title: "Extortion", punishment: "Up to 7 years, or fine, or both", maxSentenceDays: 7 * Y, citation: bnsCite("308(2)"), notes: "BNS raises the maximum from 3 to 7 years." }
  ),
  ...pair(
    { id: "IPC_406", code: "406", law: "IPC", title: "Criminal breach of trust", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: ipcCite("406") },
    { id: "BNS_316_2", code: "316(2)", law: "BNS", title: "Criminal breach of trust", punishment: "Up to 5 years, or fine, or both", maxSentenceDays: 5 * Y, citation: bnsCite("316(2)"), notes: "BNS raises the maximum from 3 to 5 years." }
  ),
  ...pair(
    { id: "IPC_411", code: "411", law: "IPC", title: "Dishonestly receiving stolen property", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: ipcCite("411") },
    { id: "BNS_317_2", code: "317(2)", law: "BNS", title: "Dishonestly receiving stolen property", punishment: "Up to 3 years, or fine, or both", maxSentenceDays: 3 * Y, citation: bnsCite("317(2)") }
  ),
  ...pair(
    { id: "IPC_420", code: "420", law: "IPC", title: "Cheating and dishonestly inducing delivery of property", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: ipcCite("420") },
    { id: "BNS_318_4", code: "318(4)", law: "BNS", title: "Cheating and dishonestly inducing delivery of property", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: bnsCite("318(4)") }
  ),
  ...pair(
    { id: "IPC_427", code: "427", law: "IPC", title: "Mischief causing damage of ₹50 or upwards", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, citation: ipcCite("427") },
    { id: "BNS_324_4", code: "324(4)", law: "BNS", title: "Mischief causing damage of ₹20,000 or more but less than ₹1 lakh", punishment: "Up to 2 years, or fine, or both", maxSentenceDays: 2 * Y, citation: bnsCite("324(4)") }
  ),
  ...pair(
    { id: "IPC_447", code: "447", law: "IPC", title: "Criminal trespass", punishment: "Up to 3 months, or fine up to ₹500, or both", maxSentenceDays: 3 * M, citation: ipcCite("447") },
    { id: "BNS_329_3", code: "329(3)", law: "BNS", title: "Criminal trespass", punishment: "Up to 3 months, or fine up to ₹5,000, or both", maxSentenceDays: 3 * M, citation: bnsCite("329(3)") }
  ),
  ...pair(
    { id: "IPC_448", code: "448", law: "IPC", title: "House-trespass", punishment: "Up to 1 year, or fine up to ₹1,000, or both", maxSentenceDays: 1 * Y, citation: ipcCite("448") },
    { id: "BNS_329_4", code: "329(4)", law: "BNS", title: "House-trespass", punishment: "Up to 1 year, or fine up to ₹5,000, or both", maxSentenceDays: 1 * Y, citation: bnsCite("329(4)") }
  ),
  ...pair(
    { id: "IPC_468", code: "468", law: "IPC", title: "Forgery for purpose of cheating", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: ipcCite("468") },
    { id: "BNS_336_3", code: "336(3)", law: "BNS", title: "Forgery for purpose of cheating", punishment: "Up to 7 years and fine", maxSentenceDays: 7 * Y, citation: bnsCite("336(3)") }
  ),

  // --- Special acts: stricter scrutiny, never auto-excluded (v4 Flaw #17) ---
  row({ id: "NDPS_21", code: "21", law: "NDPS Act", title: "Contravention in relation to manufactured drugs and preparations (quantity not established)", punishment: "Small: RI up to 1 year. Intermediate: RI up to 10 years. Commercial: RI 10 to 20 years", maxSentenceDays: 20 * Y, isGraded: true, isSpecialAct: true, citation: "Narcotic Drugs and Psychotropic Substances Act, 1985, s. 21", notes: "Quantity not established: the 20-year commercial-quantity maximum is used. §37 bail restrictions apply to commercial quantity." }),
  row({ id: "NDPS_21_A", code: "21(a)", law: "NDPS Act", title: "Manufactured drugs — small quantity", punishment: "Rigorous imprisonment up to 1 year, or fine up to ₹10,000, or both", maxSentenceDays: 1 * Y, isGraded: true, gradedBand: "small quantity", isSpecialAct: true, citation: "Narcotic Drugs and Psychotropic Substances Act, 1985, s. 21(a)" }),
  row({ id: "NDPS_21_B", code: "21(b)", law: "NDPS Act", title: "Manufactured drugs — more than small, less than commercial quantity", punishment: "Rigorous imprisonment up to 10 years and fine up to ₹1 lakh", maxSentenceDays: 10 * Y, isGraded: true, gradedBand: "intermediate quantity", isSpecialAct: true, citation: "Narcotic Drugs and Psychotropic Substances Act, 1985, s. 21(b)" }),
  row({ id: "NDPS_21_C", code: "21(c)", law: "NDPS Act", title: "Manufactured drugs — commercial quantity", punishment: "Rigorous imprisonment 10 to 20 years and fine of ₹1 to 2 lakh", maxSentenceDays: 20 * Y, isGraded: true, gradedBand: "commercial quantity", isSpecialAct: true, citation: "Narcotic Drugs and Psychotropic Substances Act, 1985, s. 21(c)" }),

  // --- State and local acts ---
  row({ id: "ARMS_25_1B_A", code: "25(1B)(a)", law: "Arms Act", title: "Acquiring, possessing or carrying a firearm or ammunition without licence", punishment: "Not less than 2 years, may extend to 5 years, and fine", maxSentenceDays: 5 * Y, citation: "Arms Act, 1959, s. 25(1B)(a), as amended by the Arms (Amendment) Act, 2019 (51 of 2019)", notes: "The 2019 amendment raised this from 1–3 years to 2–5 years; cases charged before it may carry the earlier term." }),
  row({ id: "ARMS_27_1", code: "27(1)", law: "Arms Act", title: "Using arms or ammunition in contravention of section 5", punishment: "Not less than 3 years, may extend to 7 years, and fine", maxSentenceDays: 7 * Y, citation: "Arms Act, 1959, s. 27(1)" }),
  row({ id: "TNPA_4_1_A", code: "4(1)(a)", law: "TN Prohibition Act", title: "Importing, exporting, transporting or possessing liquor or intoxicating drug", punishment: "Graded by quantity and repeat offence — up to 5 years rigorous imprisonment at the highest band", maxSentenceDays: 5 * Y, isGraded: true, citation: "Tamil Nadu Prohibition Act, 1937 (TN Act X of 1937), s. 4(1)(a)", notes: "State act — Tamil Nadu's high-volume excise-type offence. Quantity band not established: the conservative 5-year maximum is used. Verify the band against the charge sheet and the current amended text before relying on it." }),
];
