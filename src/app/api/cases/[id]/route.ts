import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

/**
 * v5 Stage 9 explainability panel — every extracted fact must show its
 * source sentence (grounding), and the formula's fraction/threshold/overdue
 * days must be visible, not just the final tier, so a lawyer can check the
 * arithmetic by hand.
 */
export async function GET(
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
    include: {
      person: true,
      formulaResult: { include: { governingSection: true } },
      trackBFlag: true,
      extractedFacts: true,
      applications: { orderBy: { generatedAt: "desc" } },
      statusEvents: { orderBy: { eventTime: "asc" } },
    },
  });

  if (!dbCase) {
    return NextResponse.json({ error: "No such case." }, { status: 404 });
  }
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    return NextResponse.json({ error: "Case is outside your district." }, { status: 403 });
  }

  // Every case view is logged, not just writes (v5 §5.5) — under-access is
  // a legal risk, but so is unnecessary viewing of sensitive undertrial data.
  await logAudit({
    actorUserId: session.userId,
    action: "viewed_case",
    entity: "Case",
    entityId: id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ case: dbCase });
}
