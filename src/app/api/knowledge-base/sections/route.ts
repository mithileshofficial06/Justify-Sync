import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/** Backs the manual-override section picker — needs a session, not public. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const sections = await db.knowledgeBaseSection.findMany({
    select: { id: true, code: true, law: true, maxSentenceDays: true },
    orderBy: [{ law: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ sections });
}
