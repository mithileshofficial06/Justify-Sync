import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkEscalation, type CaseStatus } from "@/lib/engine/escalation";
import { logAudit } from "@/lib/audit";

/**
 * v5 Stage 11/14 — the daily sweep. This is an HTTP endpoint a scheduler
 * calls, not a persistent BullMQ+Redis worker — that's the architecture
 * SPEC.md recommends for production, but it needs Redis credentials that
 * don't exist yet. This endpoint gets the same behavior (a daily pass
 * that finds stalled cases and would alert on them) running today,
 * schedulable via Vercel Cron (vercel.json) or any external cron hitting
 * this URL. Swap to BullMQ later without changing the escalation logic
 * itself — it already lives in lib/engine/escalation.ts, not here.
 *
 * Protected by a shared secret, not a lawyer session — this is meant to
 * be called by a scheduler, not a logged-in user.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cases = await db.case.findMany({
    where: { caseStatus: { not: "RELEASED" } },
    include: { person: true, district: true },
  });

  const escalations = cases
    .map((c) => {
      const result = checkEscalation(c.caseStatus.toLowerCase() as CaseStatus, c.statusUpdatedAt);
      return result.escalate
        ? { caseId: c.id, personName: c.person.nameVariants[0] ?? "Unknown", district: c.district.name, reason: result.reason }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // TODO: once TWILIO_*/RESEND_API_KEY are set, send real alerts to the
  // relevant District Admin here instead of just logging (v5 Stage 9).
  for (const e of escalations) {
    console.warn(`[daily-sweep] ESCALATE case ${e.caseId} (${e.personName}, ${e.district}): ${e.reason}`);
  }

  await logAudit({
    actorUserId: null,
    action: `daily_sweep_ran: ${escalations.length} escalations`,
    entity: "System",
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ casesChecked: cases.length, escalations });
}
