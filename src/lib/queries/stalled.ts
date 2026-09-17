import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkEscalation, type CaseStatus, type EscalationTrigger } from "@/lib/engine/escalation";
import type { SessionClaims } from "@/lib/auth/jwt";

export function districtScope(session: SessionClaims): Prisma.CaseWhereInput {
  return session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };
}

export interface StalledCase {
  caseId: string;
  personName: string;
  districtId: string;
  districtName: string;
  status: string;
  statusUpdatedAt: Date;
  trigger: EscalationTrigger;
  reason: string;
  daysStuck: number;
  limitDays: number;
  tier: 1 | 2 | null;
  overdueDays: number | null;
  daysSinceBail: number | null;
}

/**
 * Only cases actually in the filing pipeline can stall: eligible and ranked,
 * flagged under Track B, or already moved past identification. An excluded
 * juvenile record that was never eligible is not "unfiled".
 */
export async function findStalledCases(scope: Prisma.CaseWhereInput = {}, today: Date = new Date()): Promise<StalledCase[]> {
  const cases = await db.case.findMany({
    where: {
      ...scope,
      caseStatus: { not: "RELEASED" },
      custodyStatus: "in_custody",
      OR: [
        { formulaResult: { tier: { not: null } }, exclusionStatus: { in: ["CLEAR", "STRICTER_SCRUTINY"] } },
        { trackBFlag: { isNot: null } },
        { caseStatus: { not: "IDENTIFIED" } },
      ],
    },
    include: { person: true, district: true, formulaResult: true, trackBFlag: true },
  });

  return cases
    .flatMap((c): StalledCase[] => {
      const result = checkEscalation(c.caseStatus.toLowerCase() as CaseStatus, c.statusUpdatedAt, today);
      if (!result.escalate) return [];
      return [
        {
          caseId: c.id,
          personName: c.person.nameVariants[0] ?? "Unknown",
          districtId: c.districtId,
          districtName: c.district.name,
          status: c.caseStatus,
          statusUpdatedAt: c.statusUpdatedAt,
          trigger: result.trigger,
          reason: result.reason,
          daysStuck: result.daysStuck,
          limitDays: result.limitDays,
          tier: c.formulaResult?.tier === "TIER_1" ? 1 : c.formulaResult?.tier === "TIER_2" ? 2 : null,
          overdueDays: c.formulaResult?.overdueDays ?? null,
          daysSinceBail: c.trackBFlag?.daysSinceBail ?? null,
        },
      ];
    })
    .sort((a, b) => b.daysStuck - b.limitDays - (a.daysStuck - a.limitDays));
}

export function getStalledCases(session: SessionClaims) {
  return findStalledCases(districtScope(session));
}
