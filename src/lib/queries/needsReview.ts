import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";

/**
 * The queue that was missing entirely: cases stuck at NEEDS_HUMAN_REVIEW or
 * EXCLUDED never appeared anywhere in the UI before this — they simply
 * weren't visible to anyone. This is the fix.
 */
export async function getNeedsReviewCases(session: SessionClaims) {
  const districtFilter =
    session.role === "STATE_ADMIN" ? {} : { districtId: session.districtId ?? undefined };

  const cases = await db.case.findMany({
    where: {
      ...districtFilter,
      exclusionStatus: { in: ["NEEDS_HUMAN_REVIEW", "EXCLUDED"] },
    },
    include: { person: true },
    orderBy: { createdAt: "asc" },
  });

  return cases.map((c) => ({
    caseId: c.id,
    personName: c.person.nameVariants[0] ?? "Unknown",
    exclusionStatus: c.exclusionStatus,
    exclusionReason: c.exclusionReason,
    createdAt: c.createdAt,
  }));
}
