import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNeedsReviewCases } from "@/lib/queries/needsReview";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const cases = await getNeedsReviewCases(session);
  return NextResponse.json({ cases });
}
