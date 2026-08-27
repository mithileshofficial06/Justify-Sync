import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * v5 §5.5: "Active-case data retained for the life of the case plus a
 * defined post-closure window (recommend 3 years)... after that, personal
 * identifiers are purged and only anonymised statistics are retained."
 *
 * Purges ExtractedFact (the personal facts) and anonymizes the Person row
 * for cases RELEASED more than RETENTION_DAYS ago. Deliberately does NOT
 * delete the Case row itself, or FormulaResult/CaseStatusEvent — those are
 * exactly the "anonymised statistics" the accountability dashboard (v5 §4)
 * needs to keep working, and they no longer reference anything personally
 * identifying once the Person row is anonymized.
 *
 * Same scheduling story as daily-sweep: an HTTP endpoint for a cron to
 * call, protected by the same CRON_SECRET, not a persistent worker.
 */
const RETENTION_DAYS = 365 * 3;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const eligibleCases = await db.case.findMany({
    where: {
      caseStatus: "RELEASED",
      statusUpdatedAt: { lt: cutoff },
      person: { nameVariants: { isEmpty: false }, NOT: { nameVariants: { has: "[purged]" } } },
    },
    select: { id: true, personId: true },
  });

  for (const c of eligibleCases) {
    await db.$transaction([
      db.extractedFact.deleteMany({ where: { caseId: c.id } }),
      db.person.update({
        where: { id: c.personId },
        data: { nameVariants: ["[purged]"], approxAge: null, fuzzyMatchClusterId: null },
      }),
    ]);
  }

  await logAudit({
    actorUserId: null,
    action: `data_retention_purge_ran: ${eligibleCases.length} case(s) purged (retention: ${RETENTION_DAYS} days)`,
    entity: "System",
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ casesPurged: eligibleCases.length });
}
