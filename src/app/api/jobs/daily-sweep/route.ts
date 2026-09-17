import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/notifications/email";
import { runDailySweep } from "@/lib/jobs/dailySweep";

/**
 * v5 Stage 11/14 — the daily sweep: recompute custody, record newly eligible
 * cases, find stalled ones and email each district's admins a digest.
 * Protected by CRON_SECRET, which Vercel Cron sends as a Bearer token.
 */
async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const summary = await runDailySweep({ appUrl, send: sendEmail });

  await logAudit({
    actorUserId: null,
    action: `daily_sweep_ran: ${summary.recomputed} recomputed, ${summary.newlyIdentified} newly identified, ${summary.stalled} stalled, ${summary.emailsSent} digest email(s)`,
    entity: "System",
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json(summary);
}

// Vercel Cron invokes jobs with GET; POST is kept for manual triggering.
export const GET = handler;
export const POST = handler;
