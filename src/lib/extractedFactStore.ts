import { db } from "@/lib/db";
import { encryptField, decryptField } from "@/lib/crypto";

/**
 * Every read/write of ExtractedFact.value and .sourceSentence goes through
 * here — centralized so encryption (v5 §5.5) can't be accidentally
 * skipped at one of the several call sites (extraction, manual override,
 * demo seeding) the way scattered raw db.extractedFact.* calls would risk.
 */

export interface FactToStore {
  caseId: string;
  fieldName: string;
  value: string;
  sourceSentence: string;
  confidence: number;
  reviewedById?: string;
}

export async function storeExtractedFacts(facts: FactToStore[]): Promise<void> {
  if (facts.length === 0) return;
  await db.extractedFact.createMany({
    data: facts.map((f) => ({
      caseId: f.caseId,
      fieldName: f.fieldName,
      value: encryptField(f.value),
      sourceSentence: encryptField(f.sourceSentence),
      confidence: f.confidence,
      reviewedById: f.reviewedById,
    })),
  });
}

export async function getExtractedFacts(caseId: string) {
  const facts = await db.extractedFact.findMany({ where: { caseId }, orderBy: { extractedAt: "desc" } });
  return facts.map((f) => ({ ...f, value: decryptField(f.value), sourceSentence: decryptField(f.sourceSentence) }));
}

export async function getLatestExtractedFact(caseId: string, fieldName: string, minConfidence = 0) {
  const fact = await db.extractedFact.findFirst({
    where: { caseId, fieldName, confidence: { gte: minConfidence } },
    orderBy: { extractedAt: "desc" },
  });
  if (!fact) return null;
  return { ...fact, value: decryptField(fact.value), sourceSentence: decryptField(fact.sourceSentence) };
}
