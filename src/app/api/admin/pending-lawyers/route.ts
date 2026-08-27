import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/** v5 §5.4 — District Admin's queue of registrations awaiting approval, scoped to their own district. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "DISTRICT_ADMIN") {
    return NextResponse.json({ error: "Only a District Admin can view this." }, { status: 403 });
  }

  const pending = await db.user.findMany({
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

  return NextResponse.json({ pending });
}
