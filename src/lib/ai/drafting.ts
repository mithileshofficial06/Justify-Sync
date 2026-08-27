import { createChatCompletion, AI_MODEL } from "./client";

/**
 * v5 Stage 8 — AI drafts the paperwork. This never decides eligibility;
 * it only explains a tier/threshold decision the engine already made. The
 * draft is always a proposal — Stage 10 human sign-off is mandatory before
 * anything is filed (enforced by there being no "submit to court" action
 * anywhere in this codebase, only "mark as filed").
 */
export interface ReleaseApplicationInput {
  type: "release";
  personName: string;
  governingSectionCode: string;
  applicableFraction: number;
  thresholdDays: number;
  daysInCustody: number;
  overdueDays: number;
  tier: 1 | 2;
}

export interface SuretyApplicationInput {
  type: "surety";
  personName: string;
  bailOrderDate: string;
  daysSinceBail: number;
}

export type DraftInput = ReleaseApplicationInput | SuretyApplicationInput;

function buildPrompt(input: DraftInput): string {
  if (input.type === "release") {
    const fractionLabel = input.applicableFraction === 1 / 3 ? "one-third" : "one-half";
    return `Draft a formal application under Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023, seeking the release of an undertrial prisoner on the ground of having completed the statutory custody period.

Facts to use, exactly as given (do not invent any additional facts):
- Applicant name: ${input.personName}
- Governing charged section: ${input.governingSectionCode}
- Applicable statutory fraction: ${fractionLabel} of the maximum sentence
- Statutory threshold: ${input.thresholdDays} days
- Days actually in custody: ${input.daysInCustody} days
- Days overdue beyond the threshold: ${input.overdueDays} days
- Eligibility tier: ${input.tier === 1 ? "Tier 1 — has served the full maximum sentence" : "Tier 2 — has crossed the statutory threshold"}

Write in formal but plain legal English, addressed to the Court, structured as: title, brief facts, the statutory ground relied upon (cite §479 BNSS), and the prayer for release. Do not include a lawyer's signature block or date — leave that for the filing lawyer to add. Keep it under 400 words.`;
  }

  return `Draft a formal application seeking modification of the bail bond/surety conditions for an undertrial prisoner who was granted bail but has not been released due to an apparent inability to furnish the required surety.

Facts to use, exactly as given (do not invent any additional facts):
- Applicant name: ${input.personName}
- Bail order date: ${input.bailOrderDate}
- Days since bail was granted with no release: ${input.daysSinceBail}

Write in formal but plain legal English, addressed to the Court, structured as: title, brief facts, the ground (continued detention despite a bail order, apparent surety difficulty), and the prayer (reduction of surety amount / release on personal bond / such other relief as the Court deems fit). Do not include a lawyer's signature block or date. Keep it under 350 words.`;
}

export async function draftApplication(input: DraftInput): Promise<string> {
  const response = await createChatCompletion({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a legal drafting assistant. You produce application drafts only from the exact facts given to you — you never add facts, case law, or details not explicitly provided. Output only the application text, no preamble or explanation.",
      },
      { role: "user", content: buildPrompt(input) },
    ],
    max_tokens: 1200,
    temperature: 0.4,
  });

  return response.choices[0]?.message?.content ?? "";
}
