import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { generateOtpCode, hashOtpCode, otpExpiryDate, sendOtpSms } from "@/lib/auth/otp";
import { logAudit } from "@/lib/audit";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

const loginSchema = z.object({
  barEnrolmentNo: z.string(),
  password: z.string(),
});

/**
 * v5 §5.3 step 1: verify credentials, then send an OTP. Issuing a JWT
 * session happens in /api/auth/verify-otp, only after the OTP is confirmed.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { barEnrolmentNo, password } = parsed.data;
  const ipAddress = request.headers.get("x-forwarded-for");

  const user = await db.user.findUnique({ where: { barEnrolmentNo } });

  // Same generic response whether the enrolment number doesn't exist or the
  // password is wrong — don't leak which one failed.
  const genericFailure = () =>
    NextResponse.json({ error: "Invalid enrolment number or password." }, { status: 401 });

  if (!user) {
    await logAudit({ actorUserId: null, action: "login_failed_unknown_user", entity: "User", ipAddress });
    return genericFailure();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({ actorUserId: user.id, action: "login_blocked_locked", entity: "User", entityId: user.id, ipAddress });
    return NextResponse.json(
      { error: `Account locked until ${user.lockedUntil.toISOString()} after repeated failed attempts.` },
      { status: 423 }
    );
  }

  if (user.status !== "ACTIVE") {
    await logAudit({ actorUserId: user.id, action: "login_blocked_not_active", entity: "User", entityId: user.id, ipAddress });
    return NextResponse.json(
      { error: `Account is not active (status: ${user.status}). Awaiting District Admin approval.` },
      { status: 403 }
    );
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);

  if (!passwordOk) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      failedAttempts >= LOCKOUT_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts, lockedUntil },
    });

    await logAudit({ actorUserId: user.id, action: "login_failed_bad_password", entity: "User", entityId: user.id, ipAddress });

    if (lockedUntil) {
      // v5 §5.3 — alert the District Admin on lockout. Notification wiring
      // (Stage 9) lands separately; this is the trigger point for it.
      console.warn(`[auth] Account ${user.id} locked after ${failedAttempts} failed attempts — District Admin should be alerted.`);
    }

    return genericFailure();
  }

  // Password correct — issue OTP, reset failure counter.
  const otpCode = generateOtpCode();
  const otpCodeHash = await hashOtpCode(otpCode);

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      otpCodeHash,
      otpExpiresAt: otpExpiryDate(),
    },
  });

  await sendOtpSms(user.mobileNumber, otpCode);
  await logAudit({ actorUserId: user.id, action: "login_otp_sent", entity: "User", entityId: user.id, ipAddress });

  return NextResponse.json({ message: "OTP sent.", userId: user.id });
}
