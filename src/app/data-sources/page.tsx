import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Label, H1 } from "@/components/ui";

export const metadata: Metadata = { title: "Data sources · JuriSync" };

type Status = "real" | "simulated" | "synthetic";

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  real: { label: "Real", className: "border-lawyer text-lawyer" },
  synthetic: { label: "Synthetic, labelled", className: "border-foreground/60 text-foreground/80 border-dashed" },
  simulated: { label: "Simulated", className: "border-accent text-accent border-dashed" },
};

export default async function DataSourcesPage() {
  const [bySource, kb, kbVersion, custody, datasets] = await Promise.all([
    db.case.groupBy({ by: ["dataSource"], _count: true }),
    db.knowledgeBaseSection.count(),
    db.knowledgeBaseSection.findFirst({ select: { version: true } }),
    db.case.groupBy({ by: ["custodySource"], _count: true }),
    db.case.findMany({ where: { dataSource: "ECOURTS_METADATA" }, distinct: ["sourceDataset"], select: { sourceDataset: true } }),
  ]);
  const count = (s: string) => bySource.find((b) => b.dataSource === s)?._count ?? 0;
  const ecourts = count("ECOURTS_METADATA");
  const synthetic = count("SYNTHETIC_CHARGE_SHEET");
  const eprisons = custody.find((c) => c.custodySource === "EPRISONS")?._count ?? 0;

  const rows: { component: string; status: Status; now: string; why: string }[] = [
    {
      component: "Statutory knowledge base",
      status: "real",
      now: `${kb} sections, version ${kbVersion?.version ?? "—"}, each cited to the Bare Act, IPC and BNS paired.`,
      why: "Maximum sentences are public law. This table is the one input the eligibility decision cannot do without, so it is versioned and cited rather than hard-coded.",
    },
    {
      component: "Eligibility engine",
      status: "real",
      now: "Exclusions, governing section, threshold, tier, ranking, Track B and escalation — pure functions with unit tests.",
      why: "Fixed arithmetic on public law. It runs identically on synthetic and real inputs; only the input data changes between demo and pilot.",
    },
    {
      component: "Court case metadata",
      status: ecourts > 0 ? "real" : "simulated",
      now:
        ecourts > 0
          ? `${ecourts} case(s) loaded from public court metadata${datasets.length ? ` (${datasets.map((d) => d.sourceDataset).join("; ")})` : ""}, each badged "Real court metadata".`
          : "No public eCourts / Development Data Lab slice is loaded in this database yet. The loader (npm run data:load-ecourts) is built and ready for one.",
      why: "Case number, charged sections, filing date and status are public on eCourts. Running the ranking on them proves the engine works on real dockets. Where the arrest date is missing, the earliest available date is used and the case is marked \"Approx. arrest date\".",
    },
    {
      component: "Charge sheets",
      status: "synthetic",
      now: `${synthetic} synthetic charge sheet(s), fictional persons and FIR numbers, each document headed "SYNTHETIC".`,
      why: "Charge sheets are not public documents — the Supreme Court held in Saurav Das v. Union of India (2023) that they need not be published. Real ones are only available through institutional access to police or court records, so clearly labelled synthetic ones are the honest alternative for a prototype (v4 Flaw #10).",
    },
    {
      component: "AI extraction (reading)",
      status: "real",
      now: "Live pipeline: two independent extraction passes, grounding check, hedge filter. Demo cases use pre-computed readings that pass the same checks, so no live model call sits on the demo path.",
      why: "The reading step is real code, but the demo never depends on a network call to a model — and the AI never decides eligibility either way.",
    },
    {
      component: "Custody status (e-Prisons)",
      status: eprisons > 0 ? "real" : "simulated",
      now: eprisons > 0 ? `${eprisons} case(s) read from e-Prisons.` : "Every custody status is simulated from the case record and badged \"Custody: simulated\".",
      why: "e-Prisons (NPIP) is the authoritative source for who is actually inside. The adapter is built; access needs an institutional agreement with the prison department (v4 Flaw #9).",
    },
    {
      component: "Status updates (filed, heard, bail, released)",
      status: "simulated",
      now: "Seeded histories are marked by source: System, eCourts or Lawyer. Live lawyer actions on this site are real and audit-logged.",
      why: "In a pilot, hearing and bail events come from eCourts case status and release from e-Prisons; filing is always recorded by the lawyer who filed.",
    },
    {
      component: "Accounts and audit log",
      status: "real",
      now: "Bar Council enrolment login, Argon2 passwords, OTP step, district-scoped sessions, every login and case view logged. Three demo accounts exist for evaluation.",
      why: "Demo accounts get their OTP auto-filled only while DEMO_MODE is on; every other account runs the unmodified path.",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <Label>What is real, what is simulated, and why</Label>
      <div className="mt-1 mb-3">
        <H1>Data sources</H1>
      </div>
      <p className="mb-6 max-w-3xl font-mono text-[11px] leading-relaxed text-foreground/70">
        JuriSync would rather show you a clearly labelled simulation than an inflated claim. Every case in the app carries
        a badge saying where its facts came from. This page is the same statement, component by component.
      </p>

      <div className="mb-6 flex flex-wrap gap-2 font-mono text-[10px] tracking-widest uppercase">
        {(Object.keys(STATUS_STYLE) as Status[]).map((s) => (
          <span key={s} className={`border-2 px-2 py-1 ${STATUS_STYLE[s].className}`}>
            {STATUS_STYLE[s].label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <section key={r.component} className="grid gap-3 border-2 border-foreground bg-panel p-4 md:grid-cols-[14rem_1fr]">
            <div>
              <h2 className="font-display text-sm uppercase">{r.component}</h2>
              <span className={`mt-2 inline-block border-2 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${STATUS_STYLE[r.status].className}`}>
                {STATUS_STYLE[r.status].label}
              </span>
            </div>
            <div className="font-mono text-[12px] leading-relaxed">
              <p>{r.now}</p>
              <p className="mt-2 text-foreground/65">
                <span className="font-bold text-foreground/80 uppercase">Why: </span>
                {r.why}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-8 border-2 border-dashed border-foreground/50 p-4">
        <h2 className="font-display text-sm uppercase">Stated simplifications</h2>
        <ul className="mt-2 list-disc pl-5 font-mono text-[11px] leading-relaxed text-foreground/75">
          <li>Custody is treated as one continuous stretch from arrest; a pilot tracks discrete custody intervals (v4 Flaw #16).</li>
          <li>Charge-sheet format covers one district; formats vary by state because policing is a state subject (v4 Flaw #11).</li>
          <li>Possible same-person matches go to a lawyer to confirm; nothing is merged automatically (v4 Flaw #18).</li>
          <li>Bar Council enrolment is verified by the District Admin — the Bar Council of India exposes no public verification API.</li>
          <li>Nothing is ever filed automatically. A licensed lawyer signs every application.</li>
        </ul>
        <p className="mt-3 font-mono text-[11px] text-foreground/60">
          See the <Link href="/knowledge-base" className="underline hover:text-accent">knowledge base</Link> for every maximum sentence the engine uses.
        </p>
      </section>
    </main>
  );
}
