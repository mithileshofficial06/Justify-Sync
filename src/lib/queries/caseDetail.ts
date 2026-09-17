import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";
import { findPotentialMatches, type PotentialMatch } from "@/lib/entityResolution";
import { decryptField } from "@/lib/crypto";

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}

function safeDecrypt(ciphertext: string): { text: string; ok: boolean } {
  try {
    return { text: decryptField(ciphertext), ok: true };
  } catch {
    return { text: "[cannot be decrypted with the current ENCRYPTION_KEY]", ok: false };
  }
}

export async function getCaseDetail(caseId: string, session: SessionClaims) {
  const dbCase = await db.case.findUnique({
    where: { id: caseId },
    include: {
      person: true,
      district: true,
      formulaResult: { include: { governingSection: true } },
      trackBFlag: true,
      extractedFacts: { orderBy: { extractedAt: "desc" } },
      applications: { orderBy: { generatedAt: "desc" } },
      statusEvents: { orderBy: { eventTime: "asc" }, include: { setByUser: { select: { fullName: true } } } },
    },
  });

  if (!dbCase) throw new NotFoundError("No such case.");
  if (session.role !== "STATE_ADMIN" && dbCase.districtId !== session.districtId) {
    throw new ForbiddenError("Case is outside your district.");
  }

  const chargedSections = await db.knowledgeBaseSection.findMany({ where: { id: { in: dbCase.chargedSectionIds } } });
  const chargedInOrder = dbCase.chargedSectionIds
    .map((id) => chargedSections.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // Only worth computing when the multi-case question is actually
  // unresolved — this is what makes "needs review" informative instead of
  // just a dead end (v4 Flaw #18).
  let potentialMatches: (PotentialMatch & { approxAge: number | null; caseIds: string[] })[] = [];
  if (dbCase.pendingCaseFlag === "UNKNOWN") {
    const others = await db.person.findMany({
      where: { id: { not: dbCase.personId }, cases: { some: {} } },
      select: { id: true, nameVariants: true, approxAge: true, cases: { select: { id: true, districtId: true } } },
    });
    const matches = findPotentialMatches(
      { id: dbCase.personId, nameVariants: dbCase.person.nameVariants, approxAge: dbCase.person.approxAge },
      others
    );
    potentialMatches = matches.map((m) => ({
      ...m,
      approxAge: others.find((o) => o.id === m.personId)?.approxAge ?? null,
      caseIds: (others.find((o) => o.id === m.personId)?.cases ?? [])
        .filter((c) => session.role === "STATE_ADMIN" || c.districtId === session.districtId)
        .map((c) => c.id),
    }));
  }

  const extractedFacts = dbCase.extractedFacts.map((f) => {
    const value = safeDecrypt(f.value);
    const sourceSentence = safeDecrypt(f.sourceSentence);
    return { ...f, value: value.text, sourceSentence: sourceSentence.text, undecryptable: !value.ok || !sourceSentence.ok };
  });

  return { ...dbCase, chargedSections: chargedInOrder, extractedFacts, potentialMatches };
}
