import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";

/**
 * Everything the engine would not silently rank or silently drop: cases held
 * for a lawyer's decision, cases ranked but under mandatory scrutiny, and
 * cases routed out — each with the stable code the engine assigned.
 */
export async function getNeedsReviewCases(session: SessionClaims) {
  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const cases = await db.case.findMany({
    where: {
      ...districtFilter,
      exclusionStatus: { in: ["NEEDS_HUMAN_REVIEW", "EXCLUDED", "STRICTER_SCRUTINY"] },
    },
    include: { person: true, district: true, formulaResult: true },
    orderBy: { createdAt: "asc" },
  });

  const sections = await db.knowledgeBaseSection.findMany({
    where: { id: { in: [...new Set(cases.flatMap((c) => c.chargedSectionIds))] } },
    select: { id: true, law: true, code: true },
  });
  const label = (id: string) => {
    const s = sections.find((x) => x.id === id);
    return s ? `${s.law} ${s.code}` : id;
  };

  return cases.map((c) => ({
    caseId: c.id,
    personName: c.person.nameVariants[0] ?? "Unknown",
    districtName: c.district.name,
    exclusionStatus: c.exclusionStatus,
    exclusionCode: c.exclusionCode,
    exclusionReason: c.exclusionReason,
    charged: c.chargedSectionIds.map(label).join(", "),
    tier: c.formulaResult?.tier ?? null,
    overdueDays: c.formulaResult?.overdueDays ?? null,
    dataSource: c.dataSource,
    createdAt: c.createdAt,
  }));
}
