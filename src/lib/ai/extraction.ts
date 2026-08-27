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
- chargedSections: the section(s) charged, e.g. "IPC 325", "BNS 117(2)", or "NDPS 21" for special/local acts (comma-separated if multiple). Always use this "LAW NUMBER" shape — e.g. "Section 21 of the Narcotic Drugs and Psychotropic Substances Act" must be written as "NDPS 21", not spelled out.
- priorConvictions: exactly "true" or "false" — whether the accused has any prior conviction. If the document does not clearly and unconditionally state this, DO NOT extract this field at all rather than guessing. Read the FULL sentence, not just its first clause: a sentence that starts by saying there is no record of conviction, but goes on with "however", "pending", "awaited", "yet to be received", or any similar qualifier, is NOT a clear "no priors" — it means verification is incomplete, and this field must be omitted entirely.
- otherPendingCases: exactly "true", "false", or "unclear" — whether the accused has other pending cases
- bailOrder: the bail order date if one is mentioned, normalized to YYYY-MM-DD, or "none" if explicitly stated there is no bail order

For EVERY fact you extract, you must quote the EXACT sentence from the source text it came from, verbatim, in sourceSentence — quote the ENTIRE sentence, from its start to its final period, never a truncated clause. If that full sentence contains any hedge, qualifier, or condition that changes or weakens what it appears to say at first glance, that fact does not count as clearly stated — do not include it. If you cannot find a complete, unqualified sentence that directly supports a fact, do not include that fact at all.

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
  return result.data.facts.filter(
    (fact) =>
      documentText.includes(fact.sourceSentence.trim()) &&
      quotesFullSentence(documentText, fact.sourceSentence) &&
      !isHedgedBooleanClaim(fact)
  );
}

const HEDGE_PATTERN =
  /\b(however|but|yet|though|although|nevertheless|pending|awaited|still to be|not yet|has not been received|unable to (verify|confirm)|remains? unverified|unconfirmed)\b/i;

/**
 * Live-verified failure mode: the model can quote a genuinely complete
 * sentence (passing quotesFullSentence) and still assign a confident
 * "true"/"false" that contradicts a hedge clause embedded WITHIN that same
 * sentence — e.g. "...do not reflect any conviction; however, ... a
 * verification report ... is still awaited" got extracted as
 * priorConvictions=false. This isn't a grounding problem (the quote is
 * real and complete); it's the model overriding its own quoted caveat. No
 * prompt instruction fixed this reliably, so any boolean fact whose
 * backing sentence contains hedging language is rejected outright,
 * regardless of which value the model assigned.
 */
export function isHedgedBooleanClaim(fact: RawExtractedFact): boolean {
  if (fact.value !== "true" && fact.value !== "false") return false;
  return HEDGE_PATTERN.test(fact.sourceSentence);
}

/**
 * Rejects a quote that is only a PREFIX of the real sentence — verified live
 * against a model that, despite an explicit instruction not to, still
 * grounded "no prior conviction" on a truncated clause and silently dropped
 * the "however, verification is still pending" that followed it in the same
 * sentence. An instruction alone didn't fix this; a real sentence-boundary
 * check does. If the quote doesn't itself end in sentence-ending punctuation,
 * and what follows it in the document continues the same sentence (a
 * semicolon, comma, or a coordinating/contrasting word), the quote is a
 * truncated fragment, not the actual complete claim, and is rejected.
 */
export function quotesFullSentence(documentText: string, quote: string): boolean {
  const trimmedQuote = quote.trim();
  if (/[.!?]["')\]]*$/.test(trimmedQuote)) return true;

  const idx = documentText.indexOf(trimmedQuote);
  if (idx === -1) return false;
  const after = documentText.slice(idx + trimmedQuote.length, idx + trimmedQuote.length + 40).trimStart();
  const continuesSameSentence = /^[;,]|^(however|but|yet|though|although|nevertheless|except|unless|pending|awaited)\b/i.test(after);
  return !continuesSameSentence;
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
