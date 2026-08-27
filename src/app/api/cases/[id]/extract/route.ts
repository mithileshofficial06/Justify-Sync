import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { extractFactsWithSelfCheck } from "@/lib/ai/extraction";
import { buildCaseUpdateFromFacts } from "@/lib/ai/applyExtraction";
import { storeExtractedFacts } from "@/lib/extractedFactStore";
import { logAudit } from "@/lib/audit";

const extractSchema = z.object({
  documentText: z.string().min(20),
});

/**
 * v5 Stage 3 — AI reads the charge sheet. Structured facts that map
 * directly to a Case column are applied only above the confidence
 * threshold; everything extracted is stored as an ExtractedFact regardless,
 * so a low-confidence or disagreeing fact is still visible for review
 * rather than silently dropped.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = extractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbCase = await db.case.findUnique({ where: { id } });
  if (!dbCase) {
    return NextResponse.json({ error: "No such case." }, { status: 404 });
  }
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    return NextResponse.json({ error: "Case is outside your district." }, { status: 403 });
  }

  const facts = await extractFactsWithSelfCheck(parsed.data.documentText);

  await storeExtractedFacts(
    facts.map((f) => ({
      caseId: id,
      fieldName: f.fieldName,
      value: f.value,
      sourceSentence: f.sourceSentence,
      confidence: f.confidence,
    }))
  );

  const caseUpdate = buildCaseUpdateFromFacts(facts);
  if (Object.keys(caseUpdate).length > 0) {
    await db.case.update({ where: { id }, data: caseUpdate });
  }

  await logAudit({
    actorUserId: session.userId,
    action: "case_extracted",
    entity: "Case",
    entityId: id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({
    factsExtracted: facts.length,
    factsAppliedToCase: Object.keys(caseUpdate),
    facts,
  });
}
