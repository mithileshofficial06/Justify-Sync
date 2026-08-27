import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getRankedList } from "@/lib/queries/rankedList";
import { createCase } from "@/lib/caseCreate";
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

const createCaseSchema = z.object({
  personName: z.string().min(2),
  approxAge: z.number().int().positive().optional(),
  arrestDate: z.coerce.date(),
  custodyStatus: z.enum(["in_custody", "released"]).default("in_custody"),
  chargedSectionIds: z.array(z.string()).optional(),
  isJuvenile: z.boolean().optional(),
  specialActFlag: z.boolean().optional(),
  pendingCaseFlag: z.enum(["NONE", "CONFIRMED_MULTI", "UNKNOWN"]).optional(),
  bailGranted: z.boolean().optional(),
  bailOrderDate: z.coerce.date().optional(),
});

/** v5 Stage 2 — minimal case creation; charged sections/priors typically get filled in by extraction. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "LAWYER" && session.role !== "DISTRICT_ADMIN") {
    return NextResponse.json({ error: "Not authorized to create cases." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbCase = await createCase(session, parsed.data);

  await logAudit({
    actorUserId: session.userId,
    action: "case_created",
    entity: "Case",
    entityId: dbCase.id,
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ case: dbCase }, { status: 201 });
}
