import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/notifications/email";
import { logAudit } from "@/lib/audit";

/**
 * A gap that shouldn't have existed: no recovery path if a lawyer forgot
 * their password. Reuses argon2 (via hashPassword) to hash the reset token
 * itself, the same way OTP codes are hashed — never store the raw token.
 */
const schema = z.object({ barEnrolmentNo: z.string() });

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Always the same response whether or not the account exists — avoids
  // leaking which enrolment numbers are registered.
  const genericResponse = () =>
    NextResponse.json({ message: "If that enrolment number is registered, a reset link has been sent to the account's email." });

  const user = await db.user.findUnique({ where: { barEnrolmentNo: parsed.data.barEnrolmentNo } });
  if (!user || user.status !== "ACTIVE") {
    return genericResponse();
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await hashPassword(rawToken);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const resetLink = `${origin}/reset-password?userId=${user.id}&token=${rawToken}`;

  await sendEmail(
    user.email,
    "Justify-Sync: reset your password",
    `A password reset was requested for your account. This link expires in 1 hour and can only be used once:\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`
  );

  await logAudit({ actorUserId: user.id, action: "password_reset_requested", entity: "User", entityId: user.id, ipAddress: request.headers.get("x-forwarded-for") });

  return genericResponse();
}
