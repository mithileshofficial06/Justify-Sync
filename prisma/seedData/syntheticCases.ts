/**
 * Synthetic charge sheets for demo/testing — clearly fictional persons,
 * places, and FIR numbers. This exists because real charge sheets are NOT
 * public documents (Saurav Das v. Union of India, 20 Jan 2023 — v4 Flaw
 * #10), so synthetic data, honestly labeled as such, is the only legally
 * and ethically available option for a demo. Formatted loosely on the
 * Sec. 173 CrPC / Sec. 193 BNSS "final report" structure, using a
 * fictional Tamil Nadu district matching the seeded pilot district.
 *
 * Each scenario's arrest/bail dates are computed relative to the actual
 * run date, not hardcoded, so the intended tier/outcome holds whenever
 * this is actually run — see groundTruth on each entry, and
 * prisma/syntheticCases.test.ts, which checks the real engine produces
 * exactly that outcome from these dates.
 */

function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

function formatIndianDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export interface SyntheticCase {
  key: string;
  label: string;
  personName: string;
  approxAge: number;
  custodyStatus: "in_custody" | "released";
  isJuvenile: boolean;
  specialActFlag: boolean;
  chargeSheetText: string;
  /** What the engine should conclude, given these dates — used as a regression check. */
  groundTruth: {
    exclusionStatus: "CLEAR" | "EXCLUDED" | "STRICTER_SCRUTINY" | "NEEDS_HUMAN_REVIEW";
    tier: 1 | 2 | null;
    trackBFlagged: boolean;
  };
}

const FIR_PS = "B-4 Anna Nagar Police Station, Chennai District";

export function buildSyntheticCases(now: Date = new Date()): SyntheticCase[] {
  return [
    // Tier 2, first-time offender — recreates v4 §3's own worked example
    // (325 IPC, 1,140 days custody -> 288 days overdue) with live dates.
    {
      key: "tier2-first-timer",
      label: "Tier 2, first-time offender (325 IPC)",
      personName: "Karthikeyan Murugesan",
      approxAge: 34,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "CLEAR", tier: 2, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 214/2023, dated 09.03.2023
Name of Investigating Officer: Sub-Inspector R. Elangovan

1. Name and address of accused: Karthikeyan Murugesan, S/o Murugesan, aged about 34 years, residing at No. 17, Thiruvalluvar Street, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 325 of the Indian Penal Code, 1860, for voluntarily causing grievous hurt to the complainant during an altercation on 08.03.2023.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(1140, now))}.

4. Brief facts: On the night of 08.03.2023, the accused, following a dispute over a property boundary, assaulted the complainant Selvam Raja with a wooden stick, causing grievous injury to the complainant's left arm as certified by the Government Hospital, Chennai, vide medical report dated 09.03.2023.

5. Antecedents of the accused: On verification of records maintained at this police station and cross-checked with the District Crime Records Bureau, the accused has no previous conviction recorded against him.

6. Custody status: The accused remains in judicial custody at Puzhal Central Prison, Chennai, since the date of arrest, no bail application having yet been allowed by the Court.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Tier 2, general rule (prior conviction) — 420 IPC.
    {
      key: "tier2-prior-conviction",
      label: "Tier 2, prior conviction (420 IPC)",
      personName: "Anbarasan Velusamy",
      approxAge: 41,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "CLEAR", tier: 2, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 88/2022, dated 14.11.2022
Name of Investigating Officer: Inspector K. Saravanan

1. Name and address of accused: Anbarasan Velusamy, S/o Velusamy, aged about 41 years, residing at No. 52, Gandhi Nagar, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 420 of the Indian Penal Code, 1860, for cheating and dishonestly inducing delivery of property from the complainant amounting to Rs. 4,80,000 under the false pretext of a chit-fund investment scheme.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(1400, now))}.

4. Brief facts: The complainant, Ms. Bhuvaneswari, deposited a sum of Rs. 4,80,000 with the accused between June and September 2022 on the accused's representation of operating a registered chit-fund, which representation was later found to be false, the accused having no such registration.

5. Antecedents of the accused: On verification of records, it is found that the accused was previously convicted by the Additional Sessions Court, Chennai, in C.C. No. 112/2016, for an offence under Section 420 IPC, and sentenced to imprisonment, which sentence has since been served.

6. Custody status: The accused remains in judicial custody since the date of arrest.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Tier 1 — served beyond the maximum sentence itself. 379 IPC (theft, max 3 yrs).
    {
      key: "tier1-full-term",
      label: "Tier 1, full term served (379 IPC)",
      personName: "Muthu Krishnan",
      approxAge: 29,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "CLEAR", tier: 1, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 401/2020, dated 02.02.2020
Name of Investigating Officer: Sub-Inspector T. Manikandan

1. Name and address of accused: Muthu Krishnan, S/o Krishnan, aged about 29 years, residing at No. 9, Kamarajar Colony, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 379 of the Indian Penal Code, 1860, for theft of a two-wheeler belonging to the complainant.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(1200, now))}.

4. Brief facts: The accused was apprehended in possession of the complainant's motorcycle, bearing registration number TN-02-AB-4521, reported stolen on 01.02.2020.

5. Antecedents of the accused: On verification of records, the accused has no previous conviction recorded against him.

6. Custody status: The accused remains in judicial custody since the date of arrest. The trial has not yet concluded owing to pendency before the trial Court.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Not yet eligible — 411 IPC, well short of threshold.
    {
      key: "not-yet-eligible",
      label: "Not yet eligible (411 IPC)",
      personName: "Dinesh Kumar Ravichandran",
      approxAge: 25,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "CLEAR", tier: null, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 55/2026, dated 03.02.2026
Name of Investigating Officer: Sub-Inspector P. Lakshmanan

1. Name and address of accused: Dinesh Kumar Ravichandran, S/o Ravichandran, aged about 25 years, residing at No. 21, Nehru Street, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 411 of the Indian Penal Code, 1860, for dishonestly receiving stolen property, namely a laptop computer, knowing the same to be stolen property.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(200, now))}.

4. Brief facts: The accused was found in possession of a laptop computer, later identified by the complainant as one stolen from his residence on 20.01.2026, and traced to the accused through call records.

5. Antecedents of the accused: On verification of records, the accused has no previous conviction recorded against him.

6. Custody status: The accused remains in judicial custody since the date of arrest.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Stricter-scrutiny — special act, still ranked, not excluded (v4 Flaw #17).
    {
      key: "stricter-scrutiny-ndps",
      label: "Stricter scrutiny (NDPS Act, first-time offender)",
      personName: "Prabhakaran Sundaram",
      approxAge: 37,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: true,
      groundTruth: { exclusionStatus: "STRICTER_SCRUTINY", tier: 2, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 302/2023, dated 19.06.2023
Name of Investigating Officer: Inspector S. Bharathidasan

1. Name and address of accused: Prabhakaran Sundaram, S/o Sundaram, aged about 37 years, residing at No. 66, Periyar Nagar, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 21 of the Narcotic Drugs and Psychotropic Substances Act, 1985, for possession of an intermediate quantity of a psychotropic substance.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(1300, now))}.

4. Brief facts: On a routine vehicle check, the accused was found in possession of a quantity of contraband substance, seized and sent for chemical examination, the report whereof confirmed the substance to be a controlled psychotropic substance under the NDPS Act.

5. Antecedents of the accused: On verification of records, the accused has no previous conviction recorded against him.

6. Custody status: The accused remains in judicial custody since the date of arrest.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Needs human review — prior-conviction status genuinely unclear in the
    // document. This is the important negative test: extraction must NOT
    // fabricate a value here.
    {
      key: "needs-review-unclear-priors",
      label: "Needs human review (prior-conviction status unclear)",
      personName: "Ezhilarasan Chandran",
      approxAge: 31,
      custodyStatus: "in_custody",
      isJuvenile: false,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "NEEDS_HUMAN_REVIEW", tier: null, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 177/2023, dated 05.05.2023
Name of Investigating Officer: Sub-Inspector V. Gopalakrishnan

1. Name and address of accused: Ezhilarasan Chandran, S/o Chandran, aged about 31 years, residing at No. 4, Market Street, Anna Nagar, Chennai. The accused's family reports his native place as a village in a neighbouring state, and local police verification of antecedents from that jurisdiction is still awaited.

2. Sections of law: The accused is charged under Section 325 of the Indian Penal Code, 1860, for voluntarily causing grievous hurt.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(1140, now))}.

4. Brief facts: The accused assaulted the complainant during a dispute at a local market, causing grievous injury to the complainant's hand.

5. Antecedents of the accused: Local police records at this station do not reflect any conviction against the accused; however, as the accused's declared native place falls outside this jurisdiction, a character and antecedents verification report from the concerned police station is still awaited and has not been received as of the date of this report.

6. Custody status: The accused remains in judicial custody since the date of arrest.

7. Other pending cases: On enquiry, no other case is presently pending against the accused before any Court.

This report is submitted for further proceedings under Section 193 BNSS.`,
    },

    // Juvenile — excluded outright, routed to JJ Act pipeline.
    {
      key: "excluded-juvenile",
      label: "Excluded (juvenile)",
      personName: "Arun Kumar S.",
      approxAge: 16,
      custodyStatus: "in_custody",
      isJuvenile: true,
      specialActFlag: false,
      groundTruth: { exclusionStatus: "EXCLUDED", tier: null, trackBFlagged: false },
      chargeSheetText: `FINAL REPORT UNDER SECTION 193 BNSS (Sec. 173 CrPC)
Police Station: ${FIR_PS}
FIR No. 240/2025, dated 12.09.2025
Name of Investigating Officer: Sub-Inspector N. Rajendran

1. Name and address of accused: Arun Kumar S., S/o Selvaraj, aged about 16 years as per school records, residing at No. 33, Bharathi Street, Anna Nagar, Chennai.

2. Sections of law: The accused is charged under Section 379 of the Indian Penal Code, 1860, for theft.

3. Date of arrest: The accused was arrested on ${formatIndianDate(daysAgo(300, now))}.

4. Brief facts: The accused was apprehended for theft of a mobile phone from a shop.

5. Antecedents of the accused: The accused was, at the time of the offence, a minor aged 16 years, as confirmed by school transfer certificate placed on record. The matter is accordingly liable to be dealt with under the Juvenile Justice (Care and Protection of Children) Act, 2015, and not under the ordinary criminal process.

6. Custody status: The accused was produced before the Juvenile Justice Board.

This report is submitted for further proceedings.`,
    },
  ];
}

/**
 * Track B is detected structurally (bail order + still in custody + 7+
 * days), not from a charge sheet — it doesn't need one at all. Kept
 * separate from buildSyntheticCases for that reason.
 */
export interface SyntheticTrackBCase {
  key: string;
  label: string;
  personName: string;
  approxAge: number;
  bailOrderDate: Date;
  groundTruth: { trackBFlagged: true };
}

export function buildSyntheticTrackBCase(now: Date = new Date()): SyntheticTrackBCase {
  return {
    key: "trackb-surety-failure",
    label: "Track B — bail granted, still in custody (surety failure)",
    personName: "Ramamoorthy Ganesan",
    approxAge: 45,
    bailOrderDate: daysAgo(15, now),
    groundTruth: { trackBFlagged: true },
  };
}
