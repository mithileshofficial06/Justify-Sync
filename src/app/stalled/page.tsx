import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getStalledCases, type StalledCase } from "@/lib/queries/stalled";
import type { EscalationTrigger } from "@/lib/engine/escalation";
import { formatDateDMY, formatDays } from "@/lib/engine/explain";
import { Label, H1 } from "@/components/ui";
import { GrowBar, Stagger, StaggerItem } from "@/components/motion/Motion";

const GROUPS: { trigger: EscalationTrigger; title: string; leak: string; limit: string }[] = [
  {
    trigger: "not_filed",
    title: "Identified — never filed",
    leak: "Leak 1: nationally ~3,400 recommendations a quarter never become filings.",
    limit: "Escalates 30 days after identification.",
  },
  {
    trigger: "no_hearing",
    title: "Filed — no hearing",
    leak: "An application that is never listed releases nobody.",
    limit: "Escalates 60 days after filing.",
  },
  {
    trigger: "not_released",
    title: "Bail granted — still inside",
    leak: "Leak 2: nationally ~1,750 people a quarter are granted bail and never released, mostly for want of surety.",
    limit: "Escalates 7 days after the bail order.",
  },
  {
    trigger: "no_movement",
    title: "Heard — no order",
    leak: "A hearing with no recorded outcome.",
    limit: "Escalates 30 days after the hearing.",
  },
];

export default async function StalledPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stalled = await getStalledCases(session);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
      <Label>Accountability loop · runs daily</Label>
      <div className="mt-1 mb-3">
        <H1>Stalled</H1>
      </div>
      <div className="mb-8 border-2 border-foreground bg-foreground p-4 text-background">
        <p className="font-display text-lg leading-tight uppercase sm:text-2xl">
          Identification is not the bottleneck. <span className="text-accent">Filing and release are.</span>
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-background/70">
          A list of eligible people changes nothing on its own. JuriSync follows every case to release and escalates the
          moment one stops moving — to the district admin, by email, every day.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] tracking-widest uppercase">
          {GROUPS.filter((g) => g.trigger !== "no_movement" || stalled.some((s) => s.trigger === g.trigger)).map((g) => (
            <span key={g.trigger} className="border border-background/40 px-2 py-1">
              {g.title}: <span className="font-bold text-accent">{stalled.filter((s) => s.trigger === g.trigger).length}</span>
            </span>
          ))}
          <Link href="/stalled/digest" className="ml-auto border border-accent bg-accent px-2 py-1 text-white hover:bg-transparent">
            View today&apos;s digest email →
          </Link>
        </div>
      </div>

      {stalled.length === 0 && <p className="font-mono text-xs text-foreground/40 uppercase">Nothing stalled right now.</p>}

      {GROUPS.map((g) => {
        const rows = stalled.filter((s) => s.trigger === g.trigger);
        if (rows.length === 0 && g.trigger === "no_movement") return null;
        return (
          <section key={g.trigger} className="mb-8">
            <div className="mb-2 flex items-baseline gap-3 border-b-2 border-foreground pb-2">
              <h2 className="font-display text-lg tracking-tight uppercase">{g.title}</h2>
              <span className="ml-auto border-2 border-foreground px-1.5 font-mono text-xs">{rows.length}</span>
            </div>
            <p className="mb-3 font-mono text-[11px] text-foreground/60">
              {g.leak} {g.limit}
            </p>
            {rows.length === 0 ? (
              <p className="font-mono text-xs text-foreground/40 uppercase">None right now.</p>
            ) : (
              <Stagger as="ul" className="flex flex-col gap-2">
                {rows.map((s) => (
                  <StalledRow key={s.caseId} s={s} showDistrict={session.role === "STATE_ADMIN"} />
                ))}
              </Stagger>
            )}
          </section>
        );
      })}
    </main>
  );
}

function StalledRow({ s, showDistrict }: { s: StalledCase; showDistrict: boolean }) {
  const over = s.daysStuck - s.limitDays;
  const pct = Math.min(100, Math.round((s.limitDays / s.daysStuck) * 100));
  return (
    <StaggerItem as="li">
      <Link href={`/cases/${s.caseId}`} className="group block border-2 border-accent bg-panel p-3 transition-colors hover:bg-accent/5">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="font-display text-sm break-words uppercase group-hover:text-accent">{s.personName}</p>
            <p className="mt-0.5 font-mono text-[11px] text-foreground/75">{s.reason}</p>
            <p className="mt-0.5 font-mono text-[10px] text-foreground/55 uppercase">
              {showDistrict && `${s.districtName} · `}since {formatDateDMY(s.statusUpdatedAt)}
              {s.tier && s.overdueDays !== null && ` · Tier ${s.tier}, ${formatDays(s.overdueDays)} days overdue`}
              {s.daysSinceBail !== null && s.trigger !== "not_released" && ` · ${s.daysSinceBail} days since bail`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl leading-none text-accent">{formatDays(s.daysStuck)}</p>
            <p className="font-mono text-[9px] tracking-widest text-foreground/60 uppercase">days stuck</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative h-2 flex-1 border border-foreground/40 bg-accent">
            <GrowBar pct={pct} className="absolute inset-y-0 left-0 w-full" barClassName="bg-foreground/25" delay={0.2} />
          </div>
          <span className="font-mono text-[10px] whitespace-nowrap text-foreground/65 uppercase">
            limit {s.limitDays} · {formatDays(over)} over
          </span>
        </div>
      </Link>
    </StaggerItem>
  );
}
