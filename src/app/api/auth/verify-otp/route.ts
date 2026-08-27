import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isOtpExpired, verifyOtpCode } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

const verifySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

/**
 * v5 §5.3 step 2: on correct OTP, issue the district-and-role-scoped
 * session. This is the only place a session is created.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, code } = parsed.data;
  const ipAddress = request.headers.get("x-forwarded-for");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    return NextResponse.json({ error: "No OTP pending for this account." }, { status: 400 });
  }

  if (isOtpExpired(user.otpExpiresAt)) {
    return NextResponse.json({ error: "OTP expired. Please log in again." }, { status: 400 });
  }

  const otpOk = await verifyOtpCode(user.otpCodeHash, code);
  if (!otpOk) {
    await logAudit({ actorUserId: user.id, action: "otp_verify_failed", entity: "User", entityId: user.id, ipAddress });
    return NextResponse.json({ error: "Incorrect OTP." }, { status: 401 });
  }

  // OTP is single-use — clear it immediately.
  await db.user.update({
    where: { id: user.id },
    data: { otpCodeHash: null, otpExpiresAt: null },
  });

  await createSession({ userId: user.id, role: user.role, districtId: user.districtId });
  await logAudit({ actorUserId: user.id, action: "login_success", entity: "User", entityId: user.id, ipAddress });

  return NextResponse.json({
    message: "Logged in.",
    user: { id: user.id, fullName: user.fullName, role: user.role, districtId: user.districtId },
  });
}
