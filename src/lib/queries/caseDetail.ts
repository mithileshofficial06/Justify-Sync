import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}

export async function getCaseDetail(caseId: string, session: SessionClaims) {
  const dbCase = await db.case.findUnique({
    where: { id: caseId },
    include: {
      person: true,
      formulaResult: { include: { governingSection: true } },
      trackBFlag: true,
      extractedFacts: { orderBy: { extractedAt: "desc" } },
      applications: { orderBy: { generatedAt: "desc" } },
      statusEvents: { orderBy: { eventTime: "asc" } },
    },
  });

  if (!dbCase) throw new NotFoundError("No such case.");
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    throw new ForbiddenError("Case is outside your district.");
  }

  return dbCase;
}
