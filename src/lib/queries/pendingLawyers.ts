import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";

export async function getPendingLawyers(session: SessionClaims) {
  if (session.role !== "DISTRICT_ADMIN") return [];

  return db.user.findMany({
    where: { districtId: session.districtId, status: "PENDING_VERIFICATION" },
    select: {
      id: true,
      fullName: true,
      barEnrolmentNo: true,
      email: true,
      mobileNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
