import { db } from "@/lib/db";
import { checkEscalation, type CaseStatus } from "@/lib/engine/escalation";
import type { SessionClaims } from "@/lib/auth/jwt";

export async function getStalledCases(session: SessionClaims) {
  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const cases = await db.case.findMany({
    where: { ...districtFilter, caseStatus: { not: "RELEASED" } },
    include: { person: true },
  });

  return cases
    .map((c) => {
      const result = checkEscalation(c.caseStatus.toLowerCase() as CaseStatus, c.statusUpdatedAt);
      return result.escalate
        ? {
            caseId: c.id,
            personName: c.person.nameVariants[0] ?? "Unknown",
            status: c.caseStatus,
            statusUpdatedAt: c.statusUpdatedAt,
            reason: result.reason,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
