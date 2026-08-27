import { z } from "zod";
import { createChatCompletion, AI_MODEL } from "./client";

/**
 * v5 Stage 3. Every fact must carry the exact source sentence it came
 * from (v4 Flaw #6 — "grounding"); a fact with no matching quote in the
 * source text is discarded, not guessed. Extraction runs twice and only
 * agreeing facts are treated as confident (v4 Flaws #4, #8).
 */
const extractedFactSchema = z.object({
  fieldName: z.enum([
    "arrestDate",
    "chargedSections",
    "priorConvictions",
    "otherPendingCases",
    "bailOrder",
  ]),
  value: z.string(),
  sourceSentence: z.string(),
});

const extractionResponseSchema = z.object({
  facts: z.array(extractedFactSchema),
});

export type RawExtractedFact = z.infer<typeof extractedFactSchema>;

const SYSTEM_PROMPT = `You are a strict document extraction tool for Indian criminal charge sheets (Sec. 173 CrPC / 193 BNSS format).

Extract ONLY these fields, when present in the text:
- arrestDate: the date of arrest, normalized to YYYY-MM-DD
- chargedSections: the section(s) charged, e.g. "IPC 325" or "BNS 117(2)" (comma-separated if multiple)
- priorConvictions: exactly "true" or "false" — whether the accused has any prior conviction. If the document does not clearly state this, DO NOT extract this field at all rather than guessing.
- otherPendingCases: exactly "true", "false", or "unclear" — whether the accused has other pending cases
- bailOrder: the bail order date if one is mentioned, normalized to YYYY-MM-DD, or "none" if explicitly stated there is no bail order

For EVERY fact you extract, you must quote the EXACT sentence from the source text it came from, verbatim, in sourceSentence. If you cannot find a sentence that directly supports a fact, do not include that fact at all.

Respond with ONLY a JSON object matching: { "facts": [{ "fieldName": "...", "value": "...", "sourceSentence": "..." }] }. No other text, no markdown code fences.`;

async function runExtractionPass(documentText: string): Promise<RawExtractedFact[]> {
  const response = await createChatCompletion({
    model: AI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: documentText },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Model didn't return clean JSON — treat as zero extracted facts rather
    // than crash the whole request; caller sees an empty result to review.
    return [];
  }

  const result = extractionResponseSchema.safeParse(parsed);
  if (!result.success) return [];

  // Grounding check: discard any fact whose claimed source sentence doesn't
  // actually appear in the document (v4 Flaw #6) — the model can still lie
  // about a quote even when explicitly asked not to.
  return result.data.facts.filter((fact) => documentText.includes(fact.sourceSentence.trim()));
}

export interface GroundedFact extends RawExtractedFact {
  confidence: number;
}

/**
 * Runs extraction twice and keeps only facts both passes agree on
 * (same fieldName + same value), tagged high confidence. Facts that
 * disagree or appear in only one pass are still returned, but at low
 * confidence, so they route to human review rather than being dropped.
 */
export async function extractFactsWithSelfCheck(documentText: string): Promise<GroundedFact[]> {
  const [passA, passB] = await Promise.all([
    runExtractionPass(documentText),
    runExtractionPass(documentText),
  ]);

  const results: GroundedFact[] = [];
  const consumedB = new Set<number>();

  for (const factA of passA) {
    const matchIndex = passB.findIndex(
      (factB, i) => !consumedB.has(i) && factB.fieldName === factA.fieldName && factB.value === factA.value
    );
    if (matchIndex !== -1) {
      consumedB.add(matchIndex);
      results.push({ ...factA, confidence: 0.9 });
    } else {
      results.push({ ...factA, confidence: 0.4 });
    }
  }

  // Facts pass B found but pass A didn't, at low confidence too.
  passB.forEach((factB, i) => {
    if (!consumedB.has(i)) {
      results.push({ ...factB, confidence: 0.4 });
    }
  });

  return results;
}
