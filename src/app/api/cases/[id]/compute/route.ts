import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { computeCase } from "@/lib/caseCompute";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";

/** v5 Stages 4-7 — runs exclusions + Track A + Track B for one case. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  const dbCase = await db.case.findUnique({ where: { id }, select: { districtId: true } });
  if (!dbCase) {
    return NextResponse.json({ error: "No such case." }, { status: 404 });
  }
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    return NextResponse.json({ error: "Case is outside your district." }, { status: 403 });
  }

  try {
    const result = await computeCase(id);
    await logAudit({
      actorUserId: session.userId,
      action: "case_computed",
      entity: "Case",
      entityId: id,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
