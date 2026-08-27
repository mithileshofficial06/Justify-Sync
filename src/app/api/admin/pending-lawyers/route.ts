import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPendingLawyers } from "@/lib/queries/pendingLawyers";

/** v5 §5.4 — District Admin's queue of registrations awaiting approval, scoped to their own district. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "DISTRICT_ADMIN") {
    return NextResponse.json({ error: "Only a District Admin can view this." }, { status: 403 });
  }

  const pending = await getPendingLawyers(session);
  return NextResponse.json({ pending });
}
