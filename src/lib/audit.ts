import { db } from "./db";

/**
 * v5 §5.5 / Stage 13 — every login, every case view, every decision is
 * written here. Under-access is a legal risk, but so is unnecessary
 * viewing of sensitive undertrial data, so reads are logged too, not
 * just writes.
 */
export async function logAudit(entry: {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}
