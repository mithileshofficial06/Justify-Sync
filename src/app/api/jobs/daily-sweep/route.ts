import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkEscalation, type CaseStatus } from "@/lib/engine/escalation";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/notifications/email";

/**
 * v5 Stage 11/14 — the daily sweep. This is an HTTP endpoint a scheduler
 * calls, not a persistent BullMQ+Redis worker — that's the architecture
 * SPEC.md recommends for production, but it needs Redis credentials that
 * don't exist yet. This endpoint gets the same behavior (a daily pass
 * that finds stalled cases and alerts on them) running today, schedulable
 * via Vercel Cron (vercel.json) or any external cron hitting this URL.
 * Swap to BullMQ later without changing the escalation logic itself — it
 * already lives in lib/engine/escalation.ts, not here.
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
        ? {
            caseId: c.id,
            districtId: c.districtId,
            districtName: c.district.name,
            personName: c.person.nameVariants[0] ?? "Unknown",
            reason: result.reason,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Real delivery: one digest email per district, to that district's
  // active admins — not a stub. The notification body carries a summary,
  // never the underlying case content itself (v5 §5.3/Stage 9).
  const byDistrict = new Map<string, typeof escalations>();
  for (const e of escalations) {
    byDistrict.set(e.districtId, [...(byDistrict.get(e.districtId) ?? []), e]);
  }

  for (const [districtId, districtEscalations] of byDistrict) {
    const admins = await db.user.findMany({
      where: { districtId, role: "DISTRICT_ADMIN", status: "ACTIVE" },
      select: { email: true },
    });
    if (admins.length === 0) continue;

    const body = districtEscalations
      .map((e) => `- ${e.personName}: ${e.reason}`)
      .join("\n");

    for (const admin of admins) {
      await sendEmail(
        admin.email,
        `Justify-Sync: ${districtEscalations.length} case(s) stalled in ${districtEscalations[0].districtName}`,
        `The daily sweep found ${districtEscalations.length} case(s) with no status movement past their threshold:\n\n${body}\n\nLog in to review: see the "Stalled" page.`
      );
    }
  }

  await logAudit({
    actorUserId: null,
    action: `daily_sweep_ran: ${escalations.length} escalations, ${byDistrict.size} district digest(s) sent`,
    entity: "System",
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ casesChecked: cases.length, escalations });
}
