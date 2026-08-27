import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { extractFactsWithSelfCheck } from "@/lib/ai/extraction";
import { normalizeSectionText } from "@/lib/ai/sectionLookup";
import { logAudit } from "@/lib/audit";

const extractSchema = z.object({
  documentText: z.string().min(20),
});

const CONFIDENT = 0.7;

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

  await db.extractedFact.createMany({
    data: facts.map((f) => ({
      caseId: id,
      fieldName: f.fieldName,
      value: f.value,
      sourceSentence: f.sourceSentence,
      confidence: f.confidence,
    })),
  });

  // Apply confident, structured facts directly to the Case row. Anything
  // below threshold, or that fails to resolve (e.g. an unrecognized
  // section), is left on the Case row untouched — it stays visible only
  // as an ExtractedFact for a human to resolve.
  const caseUpdate: Record<string, unknown> = {};

  const arrestDateFact = facts.find((f) => f.fieldName === "arrestDate" && f.confidence >= CONFIDENT);
  if (arrestDateFact) {
    const parsedDate = new Date(arrestDateFact.value);
    if (!Number.isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
      caseUpdate.arrestDate = parsedDate;
    }
  }

  const sectionFact = facts.find((f) => f.fieldName === "chargedSections" && f.confidence >= CONFIDENT);
  if (sectionFact) {
    const resolvedIds = sectionFact.value
      .split(",")
      .map((s) => normalizeSectionText(s))
      .filter((id): id is string => id !== null);
    if (resolvedIds.length > 0) {
      caseUpdate.chargedSectionIds = resolvedIds;
    }
  }

  const pendingCasesFact = facts.find((f) => f.fieldName === "otherPendingCases" && f.confidence >= CONFIDENT);
  if (pendingCasesFact?.value === "false") {
    caseUpdate.pendingCaseFlag = "NONE";
  }
  // "true" or "unclear" is deliberately NOT auto-set to CONFIRMED_MULTI here
  // — that requires entity resolution (v4 Flaw #18), not a single document
  // mention. It stays UNKNOWN, which exclusions already routes to review.

  const bailFact = facts.find((f) => f.fieldName === "bailOrder" && f.confidence >= CONFIDENT);
  if (bailFact && bailFact.value !== "none") {
    const parsedDate = new Date(bailFact.value);
    if (!Number.isNaN(parsedDate.getTime())) {
      caseUpdate.bailGranted = true;
      caseUpdate.bailOrderDate = parsedDate;
    }
  }

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
