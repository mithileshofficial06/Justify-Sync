import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  userId: z.string().uuid(),
  token: z.string(),
  newPassword: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, token, newPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }
  if (user.passwordResetExpiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link has expired. Request a new one." }, { status: 400 });
  }

  const tokenValid = await verifyPassword(user.passwordResetTokenHash, token);
  if (!tokenValid) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      // A password reset is a good moment to also clear any lockout.
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit({ actorUserId: userId, action: "password_reset_completed", entity: "User", entityId: userId, ipAddress: request.headers.get("x-forwarded-for") });

  return NextResponse.json({ message: "Password reset. You can now log in." });
}
