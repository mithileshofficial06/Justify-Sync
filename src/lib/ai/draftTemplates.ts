import type { ReleaseApplicationInput, SuretyApplicationInput } from "./drafting";

/**
 * Deterministic application drafts built from the same facts the AI drafter
 * receives. Used to pre-generate demo drafts so no live LLM call sits on the
 * demo path, and as a fallback when no AI key is configured. Like the AI
 * drafts, these only restate the engine's decision — they never add facts.
 */

function days(n: number) {
  return n.toLocaleString("en-IN");
}

function isoToDMY(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

export function releaseApplicationTemplate(input: Omit<ReleaseApplicationInput, "type">): string {
  const fraction = Math.abs(input.applicableFraction - 1 / 3) < 0.001 ? "one-third" : "one-half";
  const limb =
    input.tier === 1
      ? "the applicant has already been detained for a period exceeding the maximum term of imprisonment that could be imposed for the offence charged"
      : `the applicant has been detained for more than ${fraction} of the maximum term of imprisonment specified for the offence charged`;
  const firstTime = fraction === "one-third";
  const fractionBasis = firstTime
    ? "The applicant has no previous conviction on record and is a first-time offender, and is therefore to be measured against one-third of the maximum term under the proviso to Section 479(1)."
    : "The applicant is measured against one-half of the maximum term under Section 479(1).";
  const relief = firstTime ? "on bond" : "on bail";

  return `IN THE COURT OF THE LEARNED JUDICIAL MAGISTRATE / SESSIONS JUDGE

APPLICATION UNDER SECTION 479 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023, FOR RELEASE OF AN UNDERTRIAL PRISONER ${relief.toUpperCase()}

In the matter of: ${input.personName} — Applicant / Accused

BRIEF FACTS
1. The applicant is an undertrial prisoner charged under ${input.governingSectionCode}, which is the offence carrying the highest maximum sentence among the sections charged.
2. The applicant has remained in judicial custody for ${days(input.daysInCustody)} days as on the date of this application.
3. ${fractionBasis}

STATUTORY GROUND
4. Section 479(1) of the BNSS provides that a person who has undergone detention for a period extending up to one-half of the maximum period of imprisonment specified for the offence shall be released by the Court on bail, and that a first-time offender who has undergone detention for a period extending up to one-third of that maximum shall be released on bond.
5. The applicable threshold in this case is ${days(input.thresholdDays)} days. The applicant has completed ${days(input.daysInCustody)} days in custody, which exceeds that threshold by ${days(input.overdueDays)} days. Accordingly, ${limb}.
6. The offence charged is not one punishable with death or imprisonment for life.

PRAYER
It is therefore respectfully prayed that this Hon'ble Court may be pleased to release the applicant ${relief} under Section 479 of the BNSS, and pass such other orders as this Court deems fit in the interests of justice.

[To be verified, signed and dated by the filing counsel]`;
}

export function suretyApplicationTemplate(input: Omit<SuretyApplicationInput, "type">): string {
  return `IN THE COURT OF THE LEARNED JUDICIAL MAGISTRATE / SESSIONS JUDGE

APPLICATION FOR MODIFICATION OF BAIL CONDITIONS / SURETY REQUIREMENT

In the matter of: ${input.personName} — Applicant / Accused

BRIEF FACTS
1. By order dated ${isoToDMY(input.bailOrderDate)}, this Hon'ble Court was pleased to grant bail to the applicant.
2. Despite the said order, the applicant continues to remain in judicial custody, ${days(input.daysSinceBail)} days after bail was granted.
3. The continued detention is attributable to the applicant's inability to furnish the surety required by the bail order, and not to any default in complying with its other conditions.

GROUND
4. An order granting bail is rendered ineffective if its conditions cannot be met by an indigent accused. Continued detention of a person already found fit for bail, solely for want of surety, defeats the purpose of that order.

PRAYER
It is therefore respectfully prayed that this Hon'ble Court may be pleased to (a) reduce the surety amount, or (b) permit the applicant to be released on personal bond without sureties, or (c) grant such other relief as this Court deems fit in the interests of justice.

[To be verified, signed and dated by the filing counsel]`;
}
