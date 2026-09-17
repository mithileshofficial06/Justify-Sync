export type CaseStatus =
  | "identified"
  | "delivered"
  | "filed"
  | "heard"
  | "bail_granted"
  | "released";

export type EscalationTrigger = "not_filed" | "no_hearing" | "not_released" | "no_movement";

export type EscalationResult =
  | { escalate: true; trigger: EscalationTrigger; reason: string; daysStuck: number; limitDays: number }
  | { escalate: false; trigger: null; reason: null; daysStuck: number; limitDays: null };

export const ESCALATION_LIMITS = {
  notFiled: 30,
  noHearing: 60,
  notReleased: 7,
  noMovement: 30,
} as const;

/**
 * v5 Stage 11 — the accountability loop. Identification is not the
 * bottleneck; filing and release are. Each trigger names the specific leak
 * so the stalled view can say what went wrong in plain language.
 */
export function checkEscalation(
  status: CaseStatus,
  statusUpdatedAt: Date,
  today: Date = new Date()
): EscalationResult {
  const daysStuck = Math.floor((today.getTime() - statusUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));

  if ((status === "identified" || status === "delivered") && daysStuck >= ESCALATION_LIMITS.notFiled) {
    return {
      escalate: true,
      trigger: "not_filed",
      daysStuck,
      limitDays: ESCALATION_LIMITS.notFiled,
      reason: `Identified as eligible ${daysStuck} days ago — no release application has been filed.`,
    };
  }

  if (status === "filed" && daysStuck >= ESCALATION_LIMITS.noHearing) {
    return {
      escalate: true,
      trigger: "no_hearing",
      daysStuck,
      limitDays: ESCALATION_LIMITS.noHearing,
      reason: `Application filed ${daysStuck} days ago — no hearing has been recorded.`,
    };
  }

  if (status === "bail_granted" && daysStuck >= ESCALATION_LIMITS.notReleased) {
    return {
      escalate: true,
      trigger: "not_released",
      daysStuck,
      limitDays: ESCALATION_LIMITS.notReleased,
      reason: `Bail granted ${daysStuck} days ago — still in custody. Probable surety failure.`,
    };
  }

  if (status === "heard" && daysStuck >= ESCALATION_LIMITS.noMovement) {
    return {
      escalate: true,
      trigger: "no_movement",
      daysStuck,
      limitDays: ESCALATION_LIMITS.noMovement,
      reason: `Heard ${daysStuck} days ago — no order recorded since.`,
    };
  }

  return { escalate: false, trigger: null, reason: null, daysStuck, limitDays: null };
}
