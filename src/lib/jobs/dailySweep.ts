import { db } from "@/lib/db";
import { computeCase } from "@/lib/caseCompute";
import { findStalledCases, type StalledCase } from "@/lib/queries/stalled";
import type { EscalationTrigger } from "@/lib/engine/escalation";

export interface Digest {
  districtId: string;
  districtName: string;
  subject: string;
  text: string;
  cases: StalledCase[];
}

const TRIGGER_HEADING: Record<EscalationTrigger, string> = {
  not_filed: "Identified but not filed (30+ days)",
  no_hearing: "Filed but no hearing (60+ days)",
  not_released: "Bail granted but not released (7+ days)",
  no_movement: "No movement after hearing (30+ days)",
};

/**
 * One digest per district. It names people and how long they have been stuck
 * — never charge-sheet facts — and points to the authenticated Stalled page
 * (v5 §5.3 / Stage 9).
 */
export function buildDigests(stalled: StalledCase[], appUrl: string, today: Date = new Date()): Digest[] {
  const byDistrict = new Map<string, StalledCase[]>();
  for (const s of stalled) byDistrict.set(s.districtId, [...(byDistrict.get(s.districtId) ?? []), s]);

  return [...byDistrict.entries()].map(([districtId, cases]) => {
    const districtName = cases[0].districtName;
    const sections = (Object.keys(TRIGGER_HEADING) as EscalationTrigger[])
      .map((trigger) => {
        const rows = cases.filter((c) => c.trigger === trigger);
        if (rows.length === 0) return null;
        return `${TRIGGER_HEADING[trigger]} — ${rows.length}\n${rows
          .map((r) => `  • ${r.personName}: stuck ${r.daysStuck} days (limit ${r.limitDays})`)
          .join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const date = today.toISOString().slice(0, 10);
    return {
      districtId,
      districtName,
      cases,
      subject: `JuriSync: ${cases.length} case(s) stalled in ${districtName} — ${date}`,
      text: `JuriSync daily sweep — ${districtName} — ${date}

${cases.length} case(s) have passed an escalation limit. Identification is not the bottleneck; filing and release are.

${sections}

Review and act: ${appUrl}/stalled
(Case details are only visible after signing in.)`,
    };
  });
}

export async function runDailySweep({ appUrl, send }: { appUrl: string; send: (to: string, subject: string, text: string) => Promise<void> }) {
  const today = new Date();

  // Custody grows by a day every day: recompute so tiers and overdue days are current.
  const live = await db.case.findMany({
    where: { custodyStatus: "in_custody", caseStatus: { not: "RELEASED" }, NOT: { chargedSectionIds: { isEmpty: true } } },
    select: { id: true },
  });
  let recomputed = 0;
  const failures: string[] = [];
  for (const { id } of live) {
    try {
      await computeCase(id);
      recomputed++;
    } catch (error) {
      failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Newly eligible cases enter the pipeline with a system-sourced event.
  const newlyEligible = await db.case.findMany({
    where: {
      custodyStatus: "in_custody",
      formulaResult: { tier: { not: null } },
      exclusionStatus: { in: ["CLEAR", "STRICTER_SCRUTINY"] },
      statusEvents: { none: {} },
    },
    select: { id: true },
  });
  for (const { id } of newlyEligible) {
    await db.$transaction([
      db.caseStatusEvent.create({ data: { caseId: id, status: "IDENTIFIED", source: "SYSTEM", note: "Daily sweep: custody crossed the §479 threshold", eventTime: today } }),
      db.case.update({ where: { id }, data: { caseStatus: "IDENTIFIED", statusUpdatedAt: today } }),
    ]);
  }

  const stalled = await findStalledCases({}, today);
  const digests = buildDigests(stalled, appUrl, today);

  let emailsSent = 0;
  for (const digest of digests) {
    const admins = await db.user.findMany({
      where: { districtId: digest.districtId, role: "DISTRICT_ADMIN", status: "ACTIVE" },
      select: { email: true },
    });
    for (const admin of admins) {
      await send(admin.email, digest.subject, digest.text);
      emailsSent++;
    }
  }

  return { recomputed, failures, newlyIdentified: newlyEligible.length, stalled: stalled.length, digests: digests.length, emailsSent };
}
