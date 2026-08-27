import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

/**
 * v5 §5.2 — registration flow. Creates a PENDING_VERIFICATION account.
 * A District Admin must approve it before login is possible (see
 * /api/auth/approve) — this endpoint never activates an account itself.
 */
const registerSchema = z.object({
  fullName: z.string().min(2),
  // State code / registration number / year, e.g. "TN/1234/2015"
  barEnrolmentNo: z.string().regex(/^[A-Z]{2}\/\d{1,10}\/\d{4}$/, {
    message: "Expected format STATE/NUMBER/YEAR, e.g. TN/1234/2015",
  }),
  districtId: z.string().min(1), // Prisma default() ids are UUIDs, but seeded/manual ones (e.g. "pilot-district") aren't
  mobileNumber: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fullName, barEnrolmentNo, districtId, mobileNumber, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { barEnrolmentNo } });
  if (existing) {
    return NextResponse.json(
      { error: "This Bar Council enrolment number is already registered." },
      { status: 409 }
    );
  }

  const district = await db.district.findUnique({ where: { id: districtId } });
  if (!district) {
    return NextResponse.json({ error: "Unknown district." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      fullName,
      barEnrolmentNo,
      role: "LAWYER",
      districtId,
      email,
      mobileNumber,
      passwordHash,
      status: "PENDING_VERIFICATION",
    },
  });

  await logAudit({
    actorUserId: user.id,
    action: "register_submitted",
    entity: "User",
    entityId: user.id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json(
    {
      message:
        "Registration submitted. A District Admin must verify and approve this account before you can log in.",
      userId: user.id,
    },
    { status: 201 }
  );
}
