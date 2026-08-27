import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { storeExtractedFacts } from "@/lib/extractedFactStore";
import { logAudit } from "@/lib/audit";

/**
 * The fallback that was missing: when AI extraction can't confidently
 * resolve a required field (confirmed live: the two self-check passes can
 * genuinely disagree on a charged section), there was no recovery path
 * except re-pasting the same text and hoping. This lets a human directly
 * assert the fact instead.
 *
 * priorConvictions has no Case column by design (v4 Flaw #12 — it must
 * always be traceable to a source, never a bare field) — so a manual
 * assertion here is recorded as an ExtractedFact with confidence 1.0 and
 * an explicit "manually confirmed" source, not silently written to the
 * Case row. computeCase already reads the latest high-confidence fact,
 * so this slots into the existing pipeline with no special-casing.
 */
const overrideSchema = z.object({
  chargedSectionIds: z.array(z.string()).optional(),
  priorConvictions: z.boolean().optional(),
  pendingCaseFlag: z.enum(["NONE", "CONFIRMED_MULTI", "UNKNOWN"]).optional(),
  isJuvenile: z.boolean().optional(),
  specialActFlag: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "LAWYER" && session.role !== "DISTRICT_ADMIN") {
    return NextResponse.json({ error: "Only a lawyer or district admin can override case facts." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbCase = await db.case.findUnique({ where: { id } });
  if (!dbCase) {
    return NextResponse.json({ error: "No such case." }, { status: 404 });
  }
  if (dbCase.districtId !== session.districtId) {
    return NextResponse.json({ error: "Case is outside your district." }, { status: 403 });
  }

  const { chargedSectionIds, priorConvictions, pendingCaseFlag, isJuvenile, specialActFlag } = parsed.data;

  if (chargedSectionIds && chargedSectionIds.length > 0) {
    const found = await db.knowledgeBaseSection.findMany({ where: { id: { in: chargedSectionIds } } });
    if (found.length !== chargedSectionIds.length) {
      return NextResponse.json({ error: "One or more section ids are not in the knowledge base." }, { status: 400 });
    }
  }

  const caseUpdate: Record<string, unknown> = {};
  if (chargedSectionIds !== undefined) caseUpdate.chargedSectionIds = chargedSectionIds;
  if (pendingCaseFlag !== undefined) caseUpdate.pendingCaseFlag = pendingCaseFlag;
  if (isJuvenile !== undefined) caseUpdate.isJuvenile = isJuvenile;
  if (specialActFlag !== undefined) caseUpdate.specialActFlag = specialActFlag;

  if (Object.keys(caseUpdate).length > 0) {
    await db.case.update({ where: { id }, data: caseUpdate });
  }

  if (priorConvictions !== undefined) {
    await storeExtractedFacts([
      {
        caseId: id,
        fieldName: "priorConvictions",
        value: String(priorConvictions),
        sourceSentence: `Manually confirmed by ${session.role.toLowerCase()} (user ${session.userId}) via override — not from a document.`,
        confidence: 1.0,
      },
    ]);
  }

  await logAudit({
    actorUserId: session.userId,
    action: `manual_override: ${Object.keys(parsed.data).join(", ")}`,
    entity: "Case",
    entityId: id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ message: "Override applied. Run Compute to re-evaluate the case." });
}
