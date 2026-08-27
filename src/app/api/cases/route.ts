import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRankedList } from "@/lib/queries/rankedList";
import { logAudit } from "@/lib/audit";

/**
 * v5 Stage 9 — the ranked list, scoped to the authenticated lawyer's own
 * district (v5 §5.4: "cannot see other districts"). Tier 1 above Tier 2,
 * most overdue first; Track B flags delivered alongside via the same call.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "LAWYER" && session.role !== "DISTRICT_ADMIN" && session.role !== "STATE_ADMIN") {
    return NextResponse.json({ error: "Not authorized to view cases." }, { status: 403 });
  }

  const result = await getRankedList(session);

  await logAudit({
    actorUserId: session.userId,
    action: "viewed_ranked_list",
    entity: "Case",
    ipAddress: null,
  });

  return NextResponse.json(result);
}
