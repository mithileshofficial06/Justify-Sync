export type CaseStatus =
  | "identified"
  | "delivered"
  | "filed"
  | "heard"
  | "bail_granted"
  | "released";

/**
 * v5 Stage 11 — the accountability loop. Any case with no status
 * movement for 30 days is escalated regardless of who was meant to
 * update it.
 */
export function checkEscalation(
  status: CaseStatus,
  statusUpdatedAt: Date,
  today: Date = new Date()
): { escalate: boolean; reason: string | null } {
  const daysSinceUpdate = Math.floor(
    (today.getTime() - statusUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (status === "delivered" && daysSinceUpdate >= 30) {
    return { escalate: true, reason: "Not filed 30+ days after identification/delivery." };
  }

  if (status === "filed" && daysSinceUpdate >= 60) {
    return { escalate: true, reason: "No hearing 60+ days after filing." };
  }

  if (status === "bail_granted" && daysSinceUpdate >= 7) {
    return { escalate: true, reason: "Not released 7+ days after bail granted — probable surety failure." };
  }

  if (daysSinceUpdate >= 30 && status !== "released") {
    return { escalate: true, reason: "No status movement for 30+ days." };
  }

  return { escalate: false, reason: null };
}
