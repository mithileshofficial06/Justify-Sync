import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";
import { findPotentialMatches, type PotentialMatch } from "@/lib/entityResolution";
import { decryptField } from "@/lib/crypto";

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

  // Only worth computing when the multi-case question is actually
  // unresolved — this is what makes "needs review" informative instead of
  // just a dead end (v4 Flaw #18).
  let potentialMatches: PotentialMatch[] = [];
  if (dbCase.pendingCaseFlag === "UNKNOWN") {
    const others = await db.person.findMany({
      where: { id: { not: dbCase.personId }, cases: { some: {} } },
      select: { id: true, nameVariants: true, approxAge: true },
    });
    potentialMatches = findPotentialMatches(
      { id: dbCase.personId, nameVariants: dbCase.person.nameVariants, approxAge: dbCase.person.approxAge },
      others
    );
  }

  const extractedFacts = dbCase.extractedFacts.map((f) => ({
    ...f,
    value: decryptField(f.value),
    sourceSentence: decryptField(f.sourceSentence),
  }));

  return { ...dbCase, extractedFacts, potentialMatches };
}
