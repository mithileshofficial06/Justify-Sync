/**
 * SIH demo dataset (build doc Section 6 — Seed Data Plan). Every case proves
 * exactly one point; `proves` says which.
 *
 * All persons, FIR numbers and charge sheets are fictional and labelled as
 * such in the document itself — real charge sheets are not public (Saurav Das
 * v. Union of India, 2023; v4 Flaw #10). Each sheet ships with the extraction
 * facts a correct reading would produce, each quoting its full source
 * sentence verbatim; sihCases.test.ts runs every one of them through the same
 * grounding and hedge filters the live AI extractor uses, then through the
 * real engine, and checks the tier each case is meant to demonstrate.
 *
 * Dates are relative to the seeding moment (UTC midnight minus N days), so
 * "1,140 days in custody" is exactly 1,140 on the day the seed runs.
 */
import type { GroundedFact } from "../../src/lib/ai/extraction";
import { DISTRICTS, PILOT_DISTRICT_ID } from "../constants";

type StatusName = "IDENTIFIED" | "DELIVERED" | "FILED" | "HEARD" | "BAIL_GRANTED" | "RELEASED";
type Source = "SYSTEM" | "ECOURTS" | "LAWYER";

export interface StatusStep {
  status: StatusName;
  daysAgo: number;
  source: Source;
  note: string;
}

export interface SihCaseSpec {
  key: string;
  districtId: string;
  seedPlanNo: number | null;
  proves: string;
  name: string;
  relation: string;
  age: number;
  address: string;
  sectionsText: string;
  sectionsExtracted: string;
  offence: string;
  briefFacts: string;
  arrestDaysAgo: number;
  antecedents: "clean" | "prior" | "hedged" | "juvenile";
  pending: "none" | "unclear";
  bailDaysAgo?: number;
  custody: "in_custody" | "released";
  isJuvenile?: boolean;
  specialActFlag?: boolean;
  history: StatusStep[];
  expect: {
    exclusion: "CLEAR" | "EXCLUDED" | "STRICTER_SCRUTINY" | "NEEDS_HUMAN_REVIEW";
    tier: 1 | 2 | null;
    overdueDays?: number;
    trackB: boolean;
  };
}

const IPC = (s: string) => `Section ${s} of the Indian Penal Code, 1860`;

const PLACE: Record<string, { station: string; prison: string; court: string; locality: string }> = {
  [PILOT_DISTRICT_ID]: { station: "Anna Nagar Police Station, Chennai District", prison: "Central Prison, Puzhal", court: "Judicial Magistrate No. II, Egmore", locality: "Anna Nagar, Chennai" },
  "district-madurai": { station: "Tallakulam Police Station, Madurai District", prison: "Central Prison, Madurai", court: "Judicial Magistrate No. I, Madurai", locality: "Tallakulam, Madurai" },
  "district-coimbatore": { station: "RS Puram Police Station, Coimbatore District", prison: "Central Prison, Coimbatore", court: "Judicial Magistrate No. III, Coimbatore", locality: "RS Puram, Coimbatore" },
};

const identified = (daysAgo: number, note = "Daily sweep: custody crossed the §479 threshold"): StatusStep => ({ status: "IDENTIFIED", daysAgo, source: "SYSTEM", note });
const delivered = (daysAgo: number): StatusStep => ({ status: "DELIVERED", daysAgo, source: "SYSTEM", note: "Added to the district DLSA lawyer's ranked worklist" });
const filed = (daysAgo: number, court: string): StatusStep => ({ status: "FILED", daysAgo, source: "LAWYER", note: `Release application marked as filed before ${court}` });
const heard = (daysAgo: number): StatusStep => ({ status: "HEARD", daysAgo, source: "ECOURTS", note: "Hearing recorded on the eCourts case status" });
const bailGranted = (daysAgo: number): StatusStep => ({ status: "BAIL_GRANTED", daysAgo, source: "ECOURTS", note: "Bail order recorded on the eCourts case status" });
const released = (daysAgo: number): StatusStep => ({ status: "RELEASED", daysAgo, source: "SYSTEM", note: "Release reflected in custody status (simulated e-Prisons feed)" });

const CHN = PILOT_DISTRICT_ID;
const MDU = "district-madurai";
const CBE = "district-coimbatore";

export const SIH_CASES: SihCaseSpec[] = [
  // ---------------- Chennai: the ten seed-plan profiles ----------------
  {
    key: "sih-01-tier1-full-term", districtId: CHN, seedPlanNo: 1,
    proves: "Tier 1 — custody beyond the full maximum sentence for the governing section",
    name: "Muthu Krishnan", relation: "S/o Krishnan", age: 29, address: "No. 9, Kamarajar Colony",
    sectionsText: IPC("379"), sectionsExtracted: "IPC 379", offence: "theft of a two-wheeler belonging to the complainant",
    briefFacts: "The accused was apprehended in possession of the complainant's motorcycle, which had been reported stolen the previous day.",
    arrestDaysAgo: 1200, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(6, "Daily sweep: custody passed the full 3-year maximum"), delivered(5)],
    expect: { exclusion: "CLEAR", tier: 1, overdueDays: 835, trackB: false },
  },
  {
    key: "sih-02-tier2-standard", districtId: CHN, seedPlanNo: 2,
    proves: "Standard Tier 2 — past the threshold, not past the full maximum (the v4 §3 worked example)",
    name: "Karthikeyan Murugesan", relation: "S/o Murugesan", age: 34, address: "No. 17, Thiruvalluvar Street",
    sectionsText: "Sections 325 and 323 of the Indian Penal Code, 1860", sectionsExtracted: "IPC 325, IPC 323",
    offence: "voluntarily causing grievous hurt and simple hurt to the complainant during an altercation",
    briefFacts: "Following a dispute over a property boundary, the accused assaulted the complainant with a wooden stick, causing a fracture of the complainant's left forearm as certified by the Government Hospital.",
    arrestDaysAgo: 1140, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(4), delivered(3)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 288, trackB: false },
  },
  {
    key: "sih-03-fraction-ordering", districtId: CHN, seedPlanNo: 3,
    proves: "First-time offender past the one-half mark, measured against one-third — the fraction-ordering catch (v4 Flaw #20)",
    name: "Selvaraj Arumugam", relation: "S/o Arumugam", age: 38, address: "No. 44, Periyar Salai",
    sectionsText: IPC("420"), sectionsExtracted: "IPC 420",
    offence: "cheating and dishonestly inducing the complainant to deliver Rs. 3,20,000 under a false promise of overseas employment",
    briefFacts: "The accused collected Rs. 3,20,000 from the complainant between March and May on the representation that he would arrange a work visa, and ceased contact after receiving the amount.",
    arrestDaysAgo: 1400, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(2), delivered(2)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 548, trackB: false },
  },
  {
    key: "sih-04-ndps-scrutiny", districtId: CHN, seedPlanNo: 4,
    proves: "NDPS charge — routed to stricter scrutiny and still ranked, never silently excluded (v4 Flaw #17)",
    name: "Prabhakaran Sundaram", relation: "S/o Sundaram", age: 37, address: "No. 66, Periyar Nagar",
    sectionsText: "Section 21(b) of the Narcotic Drugs and Psychotropic Substances Act, 1985", sectionsExtracted: "NDPS 21(b)",
    offence: "possession of a quantity of a manufactured drug greater than small quantity and lesser than commercial quantity",
    briefFacts: "During a vehicle check the accused was found in possession of a contraband substance, which the chemical examiner's report confirmed to be a manufactured drug within the intermediate-quantity range.",
    arrestDaysAgo: 1300, antecedents: "clean", pending: "none", custody: "in_custody", specialActFlag: true,
    history: [identified(3, "Daily sweep: threshold crossed — special act, routed to mandatory lawyer review")],
    expect: { exclusion: "STRICTER_SCRUTINY", tier: 2, overdueDays: 83, trackB: false },
  },
  {
    key: "sih-05-blank-priors", districtId: CHN, seedPlanNo: 5,
    proves: "Prior-conviction status unclear — never assumed to be 'no priors' (v4 Flaw #12)",
    name: "Ezhilarasan Chandran", relation: "S/o Chandran", age: 31, address: "No. 4, Market Street",
    sectionsText: IPC("325"), sectionsExtracted: "IPC 325",
    offence: "voluntarily causing grievous hurt to the complainant at a local market",
    briefFacts: "The accused assaulted the complainant during a dispute at the market, causing a fracture of the complainant's right hand.",
    arrestDaysAgo: 1140, antecedents: "hedged", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "NEEDS_HUMAN_REVIEW", tier: null, trackB: false },
  },
  {
    key: "sih-06-juvenile", districtId: CHN, seedPlanNo: 6,
    proves: "Accused under 18 at the time of the offence — excluded and routed to the Juvenile Justice Act",
    name: "Arun Kumar S.", relation: "S/o Selvaraj", age: 16, address: "No. 33, Bharathi Street",
    sectionsText: IPC("379"), sectionsExtracted: "IPC 379",
    offence: "theft of a mobile phone from a shop",
    briefFacts: "The accused was apprehended by the shopkeeper while leaving the premises with a mobile phone that had not been paid for.",
    arrestDaysAgo: 300, antecedents: "juvenile", pending: "none", custody: "in_custody", isJuvenile: true,
    history: [],
    expect: { exclusion: "EXCLUDED", tier: null, trackB: false },
  },
  {
    key: "sih-07-trackb-surety", districtId: CHN, seedPlanNo: 7,
    proves: "Bail granted 14 days ago, still in custody — Track B surety failure, with a drafted surety-modification application",
    name: "Ramamoorthy Ganesan", relation: "S/o Ganesan", age: 45, address: "No. 12, Second Cross Street",
    sectionsText: IPC("380"), sectionsExtracted: "IPC 380",
    offence: "theft of household articles from a dwelling house",
    briefFacts: "The accused entered the complainant's house through an unlocked rear door and removed a television and brass vessels, which were later recovered from a scrap dealer.",
    arrestDaysAgo: 400, antecedents: "clean", pending: "none", bailDaysAgo: 14, custody: "in_custody",
    history: [bailGranted(14)],
    expect: { exclusion: "CLEAR", tier: null, trackB: true },
  },
  {
    key: "sih-07b-trackb-surety", districtId: CHN, seedPlanNo: 7,
    proves: "Second Track B surety failure — bail granted 21 days ago, still in custody",
    name: "Jayakumar Pandian", relation: "S/o Pandian", age: 52, address: "No. 7, Ellaiamman Koil Street",
    sectionsText: IPC("406"), sectionsExtracted: "IPC 406",
    offence: "criminal breach of trust in respect of goods entrusted to him as a transport agent",
    briefFacts: "The accused, entrusted with a consignment of textiles for delivery, failed to deliver it and could not account for the goods.",
    arrestDaysAgo: 150, antecedents: "clean", pending: "none", bailDaysAgo: 21, custody: "in_custody",
    history: [bailGranted(21)],
    expect: { exclusion: "CLEAR", tier: null, trackB: true },
  },
  {
    key: "sih-08-not-filed", districtId: CHN, seedPlanNo: 8,
    proves: "Identified 45 days ago, never filed — escalation trigger and the execution-gap thesis",
    name: "Balamurugan Sekar", relation: "S/o Sekar", age: 27, address: "No. 21, Nehru Street",
    sectionsText: IPC("411"), sectionsExtracted: "IPC 411",
    offence: "dishonestly receiving a stolen laptop computer knowing it to be stolen property",
    briefFacts: "The accused was found in possession of a laptop computer later identified by the complainant as stolen from his residence, and was traced through call records.",
    arrestDaysAgo: 1000, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(45)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 635, trackB: false },
  },
  {
    key: "sih-08b-no-hearing", districtId: CHN, seedPlanNo: 8,
    proves: "Filed 75 days ago with no hearing — the second leak in the execution gap",
    name: "Gopinath Raman", relation: "S/o Raman", age: 44, address: "No. 3, Gandhi Road",
    sectionsText: IPC("379"), sectionsExtracted: "IPC 379",
    offence: "theft of copper cable from a construction site",
    briefFacts: "The accused was caught by the site watchman while loading copper cable into an autorickshaw.",
    arrestDaysAgo: 800, antecedents: "prior", pending: "none", custody: "in_custody",
    history: [identified(90), delivered(89), filed(75, PLACE[CHN].court)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 252, trackB: false },
  },
  {
    key: "sih-09-graded-304", districtId: CHN, seedPlanNo: 9,
    proves: "Graded section (§304, part not established) — the band decides whether §479 applies, so it goes to a lawyer",
    name: "Murali Dharan", relation: "S/o Dharan", age: 40, address: "No. 58, Lake View Road",
    sectionsText: IPC("304"), sectionsExtracted: "IPC 304",
    offence: "culpable homicide not amounting to murder arising out of a quarrel between neighbours",
    briefFacts: "In the course of a quarrel the accused pushed the deceased, who fell and sustained a fatal head injury.",
    arrestDaysAgo: 1500, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "NEEDS_HUMAN_REVIEW", tier: null, trackB: false },
  },
  {
    key: "sih-09b-graded-392", districtId: CHN, seedPlanNo: 9,
    proves: "Graded section (§392 robbery, band not established) — conservative 14-year maximum used, and shown",
    name: "Dhanush Raj", relation: "S/o Rajendran", age: 26, address: "No. 15, Mettu Street",
    sectionsText: IPC("392"), sectionsExtracted: "IPC 392",
    offence: "robbery of a gold chain from a pedestrian",
    briefFacts: "The accused snatched a gold chain from the complainant and threatened her when she resisted, and was identified in a test identification parade.",
    arrestDaysAgo: 1900, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(8), delivered(7)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 196, trackB: false },
  },
  {
    key: "sih-10a-entity-mohd", districtId: CHN, seedPlanNo: 10,
    proves: "Same person, two transliterations (Mohd / Mohammad) — surfaced as a human-confirm match, never auto-decided (v4 Flaw #18)",
    name: "Mohd. Irfan", relation: "S/o Abdul Rahim", age: 32, address: "No. 71, Jaffar Street",
    sectionsText: IPC("379"), sectionsExtracted: "IPC 379",
    offence: "theft of a bicycle",
    briefFacts: "The accused was found riding a bicycle reported stolen from outside a school.",
    arrestDaysAgo: 900, antecedents: "clean", pending: "unclear", custody: "in_custody",
    history: [],
    expect: { exclusion: "NEEDS_HUMAN_REVIEW", tier: null, trackB: false },
  },
  {
    key: "sih-10b-entity-mohammad", districtId: CHN, seedPlanNo: 10,
    proves: "The second record of the Mohd / Mohammad pair",
    name: "Mohammad Irfan", relation: "S/o Abdul Rahim", age: 33, address: "No. 71, Jaffar Street",
    sectionsText: IPC("411"), sectionsExtracted: "IPC 411",
    offence: "dishonestly receiving a stolen mobile phone",
    briefFacts: "The accused was found selling a mobile phone that the complainant had reported stolen.",
    arrestDaysAgo: 700, antecedents: "clean", pending: "unclear", custody: "in_custody",
    history: [],
    expect: { exclusion: "NEEDS_HUMAN_REVIEW", tier: null, trackB: false },
  },

  // ---------------- Chennai: knowledge-base and funnel coverage ----------------
  {
    key: "sih-11-fine-only", districtId: CHN, seedPlanNo: null,
    proves: "Fine-only offence (IPC 290) — held with no imprisonment possible, handled without a crash or a default",
    name: "Senthil Kumar Ganapathy", relation: "S/o Ganapathy", age: 50, address: "No. 2, Railway Colony",
    sectionsText: IPC("290"), sectionsExtracted: "IPC 290",
    offence: "causing a public nuisance on a public road",
    briefFacts: "The accused repeatedly obstructed traffic on a public road despite being asked to move by the police.",
    arrestDaysAgo: 40, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(1, "Daily sweep: fine-only offence — any custody exceeds the maximum")],
    expect: { exclusion: "CLEAR", tier: 1, overdueDays: 40, trackB: false },
  },
  {
    key: "sih-12-state-act", districtId: CHN, seedPlanNo: null,
    proves: "State act (TN Prohibition Act) — the pipeline is not IPC-only",
    name: "Pandiyan Muthuvel", relation: "S/o Muthuvel", age: 43, address: "No. 90, Canal Bank Road",
    sectionsText: "Section 4(1)(a) of the Tamil Nadu Prohibition Act, 1937", sectionsExtracted: "TNPA 4(1)(a)",
    offence: "transporting illicit arrack",
    briefFacts: "The accused was intercepted transporting plastic cans of illicit arrack on a two-wheeler.",
    arrestDaysAgo: 700, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(5), delivered(4)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 91, trackB: false },
  },
  {
    key: "sih-13-bns-not-yet", districtId: CHN, seedPlanNo: null,
    proves: "Charged under the BNS, not yet eligible — shows days remaining rather than a tier",
    name: "Rajesh Kannan", relation: "S/o Kannan", age: 30, address: "No. 11, Temple Street",
    sectionsText: "Section 318(4) of the Bharatiya Nyaya Sanhita, 2023", sectionsExtracted: "BNS 318(4)",
    offence: "cheating the complainant of Rs. 1,50,000 through a fake online trading platform",
    briefFacts: "The accused induced the complainant to transfer money into accounts controlled by him through a fraudulent trading application.",
    arrestDaysAgo: 800, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "CLEAR", tier: null, trackB: false },
  },
  {
    key: "sih-14-released", districtId: CHN, seedPlanNo: null,
    proves: "Followed all the way to release — the status timeline end to end",
    name: "Saravanan Durai", relation: "S/o Durai", age: 36, address: "No. 27, Poonamallee High Road",
    sectionsText: IPC("324"), sectionsExtracted: "IPC 324",
    offence: "voluntarily causing hurt with a knife",
    briefFacts: "The accused caused a cut injury to the complainant's arm with a vegetable knife during a quarrel.",
    arrestDaysAgo: 520, antecedents: "clean", pending: "none", bailDaysAgo: 140, custody: "released",
    history: [identified(200), delivered(199), filed(180, PLACE[CHN].court), heard(150), bailGranted(140), released(138)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },
  {
    key: "sih-15-heard", districtId: CHN, seedPlanNo: null,
    proves: "Filed and heard, awaiting order — a case moving normally",
    name: "Kavitha Ramesh", relation: "W/o Ramesh", age: 41, address: "No. 5, Vinayagar Koil Street",
    sectionsText: IPC("498A"), sectionsExtracted: "IPC 498A",
    offence: "subjecting her daughter-in-law to cruelty",
    briefFacts: "The complainant alleged sustained harassment for dowry by the accused and other family members.",
    arrestDaysAgo: 600, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(60), delivered(59), filed(45, PLACE[CHN].court), heard(10)],
    expect: { exclusion: "CLEAR", tier: 2, overdueDays: 235, trackB: false },
  },
  {
    key: "sih-16-arms-not-yet", districtId: CHN, seedPlanNo: null,
    proves: "Arms Act (special statute, not a stricter-scrutiny act) — computed normally, not yet eligible",
    name: "Karuppasamy Thevar", relation: "S/o Periyasamy", age: 34, address: "No. 8, North Mada Street",
    sectionsText: "Section 25(1B)(a) of the Arms Act, 1959", sectionsExtracted: "ARMS 25(1B)(a)",
    offence: "possession of a country-made pistol without a licence",
    briefFacts: "On specific information the accused was found carrying a country-made pistol without any licence.",
    arrestDaysAgo: 400, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "CLEAR", tier: null, trackB: false },
  },

  // ---------------- Madurai ----------------
  {
    key: "sih-mdu-01", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai Tier 1, delivered",
    name: "Pandi Karuppiah", relation: "S/o Karuppiah", age: 33, address: "No. 14, Vaigai North Street",
    sectionsText: IPC("379"), sectionsExtracted: "IPC 379", offence: "theft of goats from a farm",
    briefFacts: "The accused was found transporting four goats reported stolen from the complainant's farm.",
    arrestDaysAgo: 1300, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(12), delivered(11)],
    expect: { exclusion: "CLEAR", tier: 1, trackB: false },
  },
  {
    key: "sih-mdu-02", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai Tier 2, filed",
    name: "Suresh Alagarsamy", relation: "S/o Alagarsamy", age: 39, address: "No. 30, Anna Salai",
    sectionsText: IPC("420"), sectionsExtracted: "IPC 420", offence: "cheating through a fraudulent land sale",
    briefFacts: "The accused sold a plot of land he did not own to the complainant using forged documents.",
    arrestDaysAgo: 1000, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(40), delivered(39), filed(20, PLACE[MDU].court)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },
  {
    key: "sih-mdu-03", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai released",
    name: "Veeramani Chinnasamy", relation: "S/o Chinnasamy", age: 47, address: "No. 6, Goripalayam",
    sectionsText: IPC("325"), sectionsExtracted: "IPC 325", offence: "voluntarily causing grievous hurt",
    briefFacts: "The accused struck the complainant with an iron rod, fracturing his collarbone.",
    arrestDaysAgo: 950, antecedents: "clean", pending: "none", bailDaysAgo: 60, custody: "released",
    history: [identified(120), delivered(119), filed(100, PLACE[MDU].court), heard(75), bailGranted(60), released(58)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },
  {
    key: "sih-mdu-04", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai Track B",
    name: "Kathiresan Muniyandi", relation: "S/o Muniyandi", age: 55, address: "No. 19, Simmakkal",
    sectionsText: IPC("406"), sectionsExtracted: "IPC 406", offence: "criminal breach of trust",
    briefFacts: "The accused failed to return gold jewellery pledged with him for safe custody.",
    arrestDaysAgo: 200, antecedents: "clean", pending: "none", bailDaysAgo: 10, custody: "in_custody",
    history: [bailGranted(10)],
    expect: { exclusion: "CLEAR", tier: null, trackB: true },
  },
  {
    key: "sih-mdu-05", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai needs review",
    name: "Sundaravel Perumal", relation: "S/o Perumal", age: 28, address: "No. 3, Teppakulam",
    sectionsText: IPC("323"), sectionsExtracted: "IPC 323", offence: "voluntarily causing hurt",
    briefFacts: "The accused slapped and pushed the complainant during a dispute at a tea shop.",
    arrestDaysAgo: 420, antecedents: "hedged", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "NEEDS_HUMAN_REVIEW", tier: null, trackB: false },
  },
  {
    key: "sih-mdu-06", districtId: MDU, seedPlanNo: null, proves: "State funnel: Madurai stalled before filing",
    name: "Ilango Subramani", relation: "S/o Subramani", age: 24, address: "No. 48, KK Nagar",
    sectionsText: IPC("411"), sectionsExtracted: "IPC 411", offence: "dishonestly receiving stolen property",
    briefFacts: "The accused was found in possession of stolen motorcycle parts.",
    arrestDaysAgo: 500, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(35)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },

  // ---------------- Coimbatore ----------------
  {
    key: "sih-cbe-01", districtId: CBE, seedPlanNo: null, proves: "State funnel: Coimbatore heard",
    name: "Nagaraj Palanisamy", relation: "S/o Palanisamy", age: 42, address: "No. 22, Cross Cut Road",
    sectionsText: IPC("380"), sectionsExtracted: "IPC 380", offence: "theft in a dwelling house",
    briefFacts: "The accused removed cash and a wristwatch from the complainant's house while the family was away.",
    arrestDaysAgo: 950, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(50), delivered(49), filed(30, PLACE[CBE].court), heard(5)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },
  {
    key: "sih-cbe-02", districtId: CBE, seedPlanNo: null, proves: "State funnel: Coimbatore graded §457, filed with no hearing",
    name: "Manikandan Rangasamy", relation: "S/o Rangasamy", age: 35, address: "No. 9, Sukrawarpet",
    sectionsText: IPC("457"), sectionsExtracted: "IPC 457", offence: "house-breaking by night",
    briefFacts: "The accused broke open the rear door of a house at night and was caught by neighbours.",
    arrestDaysAgo: 2000, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [identified(100), delivered(99), filed(70, PLACE[CBE].court)],
    expect: { exclusion: "CLEAR", tier: 2, trackB: false },
  },
  {
    key: "sih-cbe-03", districtId: CBE, seedPlanNo: null, proves: "State funnel: Coimbatore Tier 1 released",
    name: "Shanmugam Kaliappan", relation: "S/o Kaliappan", age: 58, address: "No. 1, Oppanakara Street",
    sectionsText: IPC("447"), sectionsExtracted: "IPC 447", offence: "criminal trespass on agricultural land",
    briefFacts: "The accused entered and cultivated land belonging to the complainant despite a prohibitory order.",
    arrestDaysAgo: 150, antecedents: "clean", pending: "none", bailDaysAgo: 20, custody: "released",
    history: [identified(55), delivered(54), filed(40, PLACE[CBE].court), heard(25), bailGranted(20), released(19)],
    expect: { exclusion: "CLEAR", tier: 1, trackB: false },
  },
  {
    key: "sih-cbe-04", districtId: CBE, seedPlanNo: null, proves: "State funnel: Coimbatore not yet eligible",
    name: "Dinesh Velmurugan", relation: "S/o Velmurugan", age: 23, address: "No. 40, Gandhipuram",
    sectionsText: IPC("392"), sectionsExtracted: "IPC 392", offence: "robbery of a mobile phone",
    briefFacts: "The accused threatened a college student with a knife and took his mobile phone.",
    arrestDaysAgo: 800, antecedents: "clean", pending: "none", custody: "in_custody",
    history: [],
    expect: { exclusion: "CLEAR", tier: null, trackB: false },
  },
  {
    key: "sih-cbe-05", districtId: CBE, seedPlanNo: null, proves: "State funnel: Coimbatore NDPS small quantity, stricter scrutiny",
    name: "Arjun Mohanraj", relation: "S/o Mohanraj", age: 21, address: "No. 13, Saibaba Colony",
    sectionsText: "Section 21(a) of the Narcotic Drugs and Psychotropic Substances Act, 1985", sectionsExtracted: "NDPS 21(a)",
    offence: "possession of a small quantity of a manufactured drug",
    briefFacts: "The accused was found in possession of a small quantity of a manufactured drug near a bus stand.",
    arrestDaysAgo: 200, antecedents: "clean", pending: "none", custody: "in_custody", specialActFlag: true,
    history: [identified(9, "Daily sweep: threshold crossed — special act, routed to mandatory lawyer review")],
    expect: { exclusion: "STRICTER_SCRUTINY", tier: 2, trackB: false },
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function utcMidnightDaysAgo(n: number, now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - n * DAY_MS);
}

export function daysAgoAt(n: number, now: Date): Date {
  return new Date(now.getTime() - n * DAY_MS);
}

function dmy(d: Date) {
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface BuiltCase {
  spec: SihCaseSpec;
  chargeSheetText: string;
  facts: GroundedFact[];
  arrestDate: Date;
  bailOrderDate: Date | null;
}

export function districtName(id: string) {
  return DISTRICTS.find((d) => d.id === id)?.name ?? id;
}

export function buildCase(spec: SihCaseSpec, now: Date): BuiltCase {
  const place = PLACE[spec.districtId];
  const arrestDate = utcMidnightDaysAgo(spec.arrestDaysAgo, now);
  const bailOrderDate = spec.bailDaysAgo !== undefined ? utcMidnightDaysAgo(spec.bailDaysAgo, now) : null;
  const firYear = arrestDate.getUTCFullYear();
  const firNo = 100 + (Math.abs([...spec.key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 800);

  const S = {
    sections: `The accused is charged under ${spec.sectionsText}, for ${spec.offence}.`,
    arrest: `The accused was arrested on ${dmy(arrestDate)}.`,
    priorsClean: "On verification of records, no previous conviction is recorded against the accused.",
    priorsPrior: `On verification of records, the accused was previously convicted by the ${place.court} in C.C. No. ${firNo - 60}/${firYear - 6} and has served that sentence.`,
    priorsHedged:
      "Local police records at this station do not reflect any conviction against the accused; however, a character and antecedents verification report from the accused's native district is still awaited and has not been received as of the date of this report.",
    priorsJuvenile:
      "The accused was a minor aged 16 years at the time of the offence, as confirmed by the school transfer certificate placed on record, and the matter is liable to be dealt with under the Juvenile Justice (Care and Protection of Children) Act, 2015.",
    bail: bailOrderDate ? `Bail was granted to the accused by the Court by order dated ${dmy(bailOrderDate)}.` : "",
    pendingNone: "On enquiry, no other case is presently pending against the accused before any Court.",
    pendingUnclear:
      "On enquiry, records show a case registered against a person of a similar name at another police station, which could not be linked to the accused with certainty.",
  };

  const antecedentLine = {
    clean: S.priorsClean,
    prior: S.priorsPrior,
    hedged: S.priorsHedged,
    juvenile: S.priorsJuvenile,
  }[spec.antecedents];

  let custodyLine: string;
  if (spec.custody === "released") {
    custodyLine = `${S.bail} The accused has since furnished the required surety and is no longer in custody.`;
  } else if (bailOrderDate) {
    custodyLine = `${S.bail} The accused has not furnished the surety required by that order and remains in judicial custody at ${place.prison}.`;
  } else {
    custodyLine = `The accused remains in judicial custody at ${place.prison} since the date of arrest.`;
  }

  const chargeSheetText = `SYNTHETIC DOCUMENT — fictional persons and FIR numbers, generated for demonstration only.

FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${place.station}
FIR No. ${firNo}/${firYear}
District: ${districtName(spec.districtId)}

1. Name and address of accused: ${spec.name}, ${spec.relation}, aged about ${spec.age} years, residing at ${spec.address}, ${place.locality}.

2. Sections of law: ${S.sections}

3. Date of arrest: ${S.arrest}

4. Brief facts: ${spec.briefFacts}

5. Antecedents of the accused: ${antecedentLine}

6. Custody status: ${custodyLine}

7. Other pending cases: ${spec.pending === "none" ? S.pendingNone : S.pendingUnclear}

This report is submitted for further proceedings under Section 193 BNSS.`;

  const fact = (fieldName: GroundedFact["fieldName"], value: string, sourceSentence: string): GroundedFact => ({
    fieldName,
    value,
    sourceSentence,
    confidence: 0.9,
  });

  const facts: GroundedFact[] = [
    fact("chargedSections", spec.sectionsExtracted, S.sections),
    fact("arrestDate", iso(arrestDate), S.arrest),
  ];
  // A hedged antecedents sentence yields no priorConvictions fact — exactly what
  // the live extractor's hedge filter does. Juvenile records are routed out
  // before prior convictions matter.
  if (spec.antecedents === "clean") facts.push(fact("priorConvictions", "false", S.priorsClean));
  if (spec.antecedents === "prior") facts.push(fact("priorConvictions", "true", S.priorsPrior));
  facts.push(
    spec.pending === "none"
      ? fact("otherPendingCases", "false", S.pendingNone)
      : fact("otherPendingCases", "unclear", S.pendingUnclear)
  );
  if (bailOrderDate) facts.push(fact("bailOrder", iso(bailOrderDate), S.bail));

  return { spec, chargeSheetText, facts, arrestDate, bailOrderDate };
}
