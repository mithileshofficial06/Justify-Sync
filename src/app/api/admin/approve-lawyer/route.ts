import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

/**
 * v5 §5.2 — District Admin confirms the applicant is a genuine,
 * currently-assigned DLSA/Legal Aid Defence Counsel for their district,
 * cross-checked against the DLSA's own panel-lawyer list (offline check;
 * this endpoint just records the decision).
 */
const approveSchema = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "DISTRICT_ADMIN") {
    return NextResponse.json({ error: "Only a District Admin can approve lawyer registrations." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, decision, reason } = parsed.data;
  const ipAddress = request.headers.get("x-forwarded-for");

  const applicant = await db.user.findUnique({ where: { id: userId } });
  if (!applicant) {
    return NextResponse.json({ error: "No such user." }, { status: 404 });
  }
  if (applicant.status !== "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: `User is not pending verification (current status: ${applicant.status}).` },
      { status: 409 }
    );
  }
  // A District Admin only approves lawyers in their own district — this is
  // the same district-scoping the session already carries (v5 §5.3).
  if (applicant.districtId !== session.districtId) {
    return NextResponse.json(
      { error: "You can only approve registrations for your own district." },
      { status: 403 }
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { status: decision === "approve" ? "ACTIVE" : "REJECTED" },
  });

  await logAudit({
    actorUserId: session.userId,
    action: decision === "approve" ? "lawyer_approved" : `lawyer_rejected${reason ? `: ${reason}` : ""}`,
    entity: "User",
    entityId: userId,
    ipAddress,
  });

  return NextResponse.json({
    message: `Application ${decision === "approve" ? "approved" : "rejected"}.`,
    user: { id: updated.id, fullName: updated.fullName, status: updated.status },
  });
}
