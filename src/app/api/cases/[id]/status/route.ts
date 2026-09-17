import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { computeCase } from "@/lib/caseCompute";

const statusSchema = z.object({
  status: z.enum(["FILED", "HEARD", "BAIL_GRANTED", "RELEASED"]),
});

/**
 * v5 Stage 10 — "The lawyer always makes the final decision to file; the
 * system never files anything itself." This endpoint only ever RECORDS a
 * decision the lawyer already made outside the system (or confirms one
 * eCourts polling will later report automatically) — it never files
 * anything on its own.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "LAWYER") {
    return NextResponse.json({ error: "Only the assigned lawyer can update case status." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
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

  const { status } = parsed.data;
  const now = new Date();

  // Outcome statuses change the facts Track B reads: a released person must
  // drop off the surety-failure list, and a recorded bail order starts its clock.
  const outcome =
    status === "RELEASED"
      ? { custodyStatus: "released" }
      : status === "BAIL_GRANTED"
        ? { bailGranted: true, bailOrderDate: dbCase.bailOrderDate ?? now }
        : {};

  const NOTE: Record<typeof status, string> = {
    FILED: "Release application marked as filed by counsel",
    HEARD: "Hearing recorded by counsel",
    BAIL_GRANTED: "Bail order recorded by counsel",
    RELEASED: "Release confirmed by counsel",
  };

  const [updatedCase] = await db.$transaction([
    db.case.update({
      where: { id },
      data: { caseStatus: status, statusUpdatedAt: now, ...outcome },
    }),
    db.caseStatusEvent.create({
      data: { caseId: id, status, setByUserId: session.userId, source: "LAWYER", note: NOTE[status], eventTime: now },
    }),
  ]);

  if (status === "RELEASED" || status === "BAIL_GRANTED") {
    await computeCase(id).catch((error) => console.error(`[status] recompute after ${status} failed for ${id}:`, error));
  }

  await logAudit({
    actorUserId: session.userId,
    action: `status_set_${status.toLowerCase()}`,
    entity: "Case",
    entityId: id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ case: updatedCase });
}
