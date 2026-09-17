import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { findStalledCases, districtScope } from "@/lib/queries/stalled";
import { buildDigests } from "@/lib/jobs/dailySweep";
import { db } from "@/lib/db";
import { Label, H1 } from "@/components/ui";

export default async function DigestPreviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const h = await headers();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const digests = buildDigests(await findStalledCases(districtScope(session)), appUrl);

  const recipients = await db.user.findMany({
    where: { role: "DISTRICT_ADMIN", status: "ACTIVE", districtId: { in: digests.map((d) => d.districtId) } },
    select: { districtId: true, email: true },
  });
  const lastRun = await db.auditLog.findFirst({ where: { action: { startsWith: "daily_sweep_ran" } }, orderBy: { timestamp: "desc" } });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <Link href="/stalled" className="font-mono text-[10px] tracking-widest uppercase underline hover:text-accent">
        ← Stalled
      </Link>
      <div className="mt-2">
        <Label>Escalation digest · preview</Label>
      </div>
      <div className="mt-1 mb-3">
        <H1>Today&apos;s digest</H1>
      </div>
      <p className="mb-6 font-mono text-[11px] leading-relaxed text-foreground/65">
        This is the exact email the daily sweep sends to each district&apos;s admins, rendered here because you cannot see
        their inbox. It names people and how long they have been stuck — never charge-sheet facts — and links back to the
        signed-in Stalled page.{" "}
        {lastRun ? `Last sweep: ${lastRun.timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC.` : "The sweep has not run on this database yet."}
      </p>

      {digests.length === 0 && <p className="font-mono text-xs text-foreground/40 uppercase">No district has a stalled case today — no email would be sent.</p>}

      <div className="flex flex-col gap-6">
        {digests.map((d) => {
          const to = recipients.filter((r) => r.districtId === d.districtId).map((r) => r.email);
          return (
            <article key={d.districtId} className="border-2 border-foreground bg-panel">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b-2 border-foreground bg-background px-4 py-3 font-mono text-[11px]">
                <dt className="text-foreground/55 uppercase">From</dt>
                <dd>{process.env.NOTIFICATION_FROM_EMAIL || "JuriSync <onboarding@resend.dev>"}</dd>
                <dt className="text-foreground/55 uppercase">To</dt>
                <dd className="break-all">{to.length ? to.join(", ") : `${d.districtName} district admins (none active)`}</dd>
                <dt className="text-foreground/55 uppercase">Subject</dt>
                <dd className="font-bold">{d.subject}</dd>
              </dl>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{d.text}</pre>
            </article>
          );
        })}
      </div>
    </main>
  );
}
