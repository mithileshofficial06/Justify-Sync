import { db } from "@/lib/db";
import type { SessionClaims } from "@/lib/auth/jwt";

export interface CreateCaseInput {
  personName: string;
  approxAge?: number;
  arrestDate: Date;
  custodyStatus: "in_custody" | "released";
  chargedSectionIds?: string[];
  isJuvenile?: boolean;
  specialActFlag?: boolean;
  pendingCaseFlag?: "NONE" | "CONFIRMED_MULTI" | "UNKNOWN";
  bailGranted?: boolean;
  bailOrderDate?: Date | null;
}

/**
 * v5 Stage 2 — creates the minimal case record. Charged sections and
 * prior-conviction status are typically still unknown at this point and
 * get filled in by extraction (Stage 3) — compute (Stages 4-7) simply
 * won't succeed until they're resolved, which is the correct behavior,
 * not an error to work around here.
 */
export async function createCase(session: SessionClaims, input: CreateCaseInput) {
  const districtId = session.districtId;
  if (!districtId) {
    throw new Error("Session has no district — only a district-scoped lawyer/admin can create a case.");
  }

  const person = await db.person.create({
    data: { nameVariants: [input.personName], approxAge: input.approxAge },
  });

  return db.case.create({
    data: {
      personId: person.id,
      districtId,
      arrestDate: input.arrestDate,
      custodyStatus: input.custodyStatus,
      chargedSectionIds: input.chargedSectionIds ?? [],
      isJuvenile: input.isJuvenile ?? false,
      specialActFlag: input.specialActFlag ?? false,
      pendingCaseFlag: input.pendingCaseFlag ?? "UNKNOWN",
      bailGranted: input.bailGranted ?? false,
      bailOrderDate: input.bailOrderDate ?? null,
    },
    include: { person: true },
  });
}
