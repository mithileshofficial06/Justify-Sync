import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { draftApplication } from "@/lib/ai/drafting";
import { logAudit } from "@/lib/audit";

/**
 * v5 Stage 8. Requires computeCase (Stages 4-7) to have already run —
 * drafting only ever explains a tier/flag the engine has already decided,
 * it never re-derives eligibility itself.
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

  const dbCase = await db.case.findUnique({
    where: { id },
    include: { person: true, formulaResult: { include: { governingSection: true } }, trackBFlag: true },
  });
  if (!dbCase) {
    return NextResponse.json({ error: "No such case." }, { status: 404 });
  }
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    return NextResponse.json({ error: "Case is outside your district." }, { status: 403 });
  }

  const personName = dbCase.person.nameVariants[0] ?? "the accused";
  let draftText: string;
  let type: "release" | "surety";

  if (dbCase.formulaResult?.tier) {
    type = "release";
    draftText = await draftApplication({
      type: "release",
      personName,
      governingSectionCode: dbCase.formulaResult.governingSection.code,
      applicableFraction: dbCase.formulaResult.applicableFraction,
      thresholdDays: dbCase.formulaResult.thresholdDays,
      daysInCustody: dbCase.formulaResult.daysInCustody,
      overdueDays: dbCase.formulaResult.overdueDays ?? 0,
      tier: dbCase.formulaResult.tier === "TIER_1" ? 1 : 2,
    });
  } else if (dbCase.trackBFlag && dbCase.trackBFlag.daysSinceBail !== null) {
    type = "surety";
    draftText = await draftApplication({
      type: "surety",
      personName,
      bailOrderDate: dbCase.trackBFlag.bailOrderDate?.toISOString().slice(0, 10) ?? "unknown",
      daysSinceBail: dbCase.trackBFlag.daysSinceBail,
    });
  } else {
    return NextResponse.json(
      { error: "This case has no eligible tier or Track B flag yet. Run /compute first." },
      { status: 400 }
    );
  }

  const application = await db.application.create({
    data: { caseId: id, type, draftText },
  });

  await logAudit({
    actorUserId: session.userId,
    action: `application_drafted_${type}`,
    entity: "Application",
    entityId: application.id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ application });
}
