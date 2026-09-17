import Link from "next/link";
import { getRankedList } from "@/lib/queries/rankedList";
import type { SessionClaims } from "@/lib/auth/jwt";
import { formatDateDMY, formatDays, fractionLabel } from "@/lib/engine/explain";
import { ArrestProxyBadge, CustodySourceBadge, DataSourceBadge } from "@/components/case/Provenance";
import { Label, H1 } from "@/components/ui";

type Data = Awaited<ReturnType<typeof getRankedList>>;
type Row = Data["trackA"][number];

const STATUS_LABEL: Record<string, string> = {
  IDENTIFIED: "Identified",
  DELIVERED: "Delivered",
  FILED: "Filed",
  HEARD: "Heard",
  BAIL_GRANTED: "Bail granted",
  RELEASED: "Released",
};

export async function RankedListDashboard({ session }: { session: SessionClaims }) {
  const { trackA, trackB, header } = await getRankedList(session);
  const tier1 = trackA.filter((c) => c.tier === 1);
  const tier2 = trackA.filter((c) => c.tier === 2);
  const showDistrict = session.role === "STATE_ADMIN";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <Label>Daily ranked worklist</Label>
      <div className="mt-1 mb-4">
        <H1>Ranked list</H1>
      </div>

      <div className="mb-8 border-2 border-foreground">
        <dl className="grid grid-cols-2 gap-px bg-foreground sm:grid-cols-4">
          <HeaderStat label="District" value={header.districtName} />
          <HeaderStat label="Date" value={formatDateDMY(new Date())} />
          <HeaderStat label="Undertrials scanned" value={formatDays(header.scanned)} />
          <HeaderStat label="Eligible today" value={formatDays(header.eligible)} accent />
        </dl>
        <p className="border-t-2 border-foreground bg-panel px-3 py-2 font-mono text-[10px] leading-relaxed tracking-wide text-foreground/70 uppercase">
          <span className="font-bold text-foreground">Data provenance:</span>{" "}
          {header.sources.ecourts > 0 && (
            <>
              {formatDays(header.sources.ecourts)} from real court metadata
              {header.ecourtsDatasets.length > 0 && ` (${header.ecourtsDatasets.join("; ")})`} ·{" "}
            </>
          )}
          {header.sources.synthetic > 0 && <>{formatDays(header.sources.synthetic)} synthetic charge sheets · </>}
          {header.sources.manual > 0 && <>{formatDays(header.sources.manual)} manual entries · </>}
          custody status simulated (e-Prisons adapter)
          {header.lastComputed && <> · last computed {formatDateDMY(header.lastComputed)}</>} ·{" "}
          <Link href="/data-sources" className="underline hover:text-accent">
            what is real
          </Link>
        </p>
      </div>

      <TierSection
        heading="Tier 1 — held longer than the maximum sentence"
        sub="These people have already been detained longer than the longest sentence the court could give them for the governing charge."
        rows={tier1}
        heavy
        showDistrict={showDistrict}
      />

      <TierSection
        heading="Tier 2 — statutory threshold crossed"
        sub="Custody has passed the applicable fraction of the maximum sentence (1/3 for a first-time offender, 1/2 otherwise). §479 BNSS says they shall be released."
        rows={tier2}
        showDistrict={showDistrict}
      />

      <section className="mb-10">
        <SectionHeading title="Track B — bail granted, still inside" count={trackB.length} />
        <p className="mb-3 max-w-2xl font-mono text-[11px] text-foreground/60">
          A court has already granted bail. Seven or more days later they have not walked out — almost always a surety
          problem. No sentencing law needed.
        </p>
        {trackB.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-2">
            {trackB.map((c) => (
              <li key={c.caseId}>
                <Link
                  href={`/cases/${c.caseId}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-x-3 border-2 border-foreground bg-panel p-3 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm break-words uppercase group-hover:text-accent">{c.personName}</p>
                    <p className="font-mono text-[11px] text-foreground/60">
                      {showDistrict && `${c.districtName} · `}Bail ordered {c.bailOrderDate ? formatDateDMY(c.bailOrderDate) : "— date missing"} · still in
                      custody · surety draft ready
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <DataSourceBadge source={c.dataSource} compact />
                      <CustodySourceBadge source={c.custodySource} compact />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl leading-none text-accent">{c.daysSinceBail ?? "?"}</p>
                    <p className="font-mono text-[9px] tracking-widest text-foreground/60 uppercase">days since bail</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-panel px-3 py-2">
      <dt className="font-mono text-[9px] tracking-widest text-foreground/55 uppercase">{label}</dt>
      <dd className={`font-display text-lg uppercase sm:text-xl ${accent ? "text-accent" : ""}`}>{value}</dd>
    </div>
  );
}

function SectionHeading({ title, count, heavy }: { title: string; count: number; heavy?: boolean }) {
  return (
    <div className={`mb-2 flex items-baseline gap-3 pb-2 ${heavy ? "border-b-4 border-accent" : "border-b-2 border-foreground"}`}>
      <h2 className={`font-display tracking-tight uppercase ${heavy ? "text-xl text-accent sm:text-2xl" : "text-lg"}`}>{title}</h2>
      <span className={`ml-auto font-mono text-xs ${heavy ? "border-2 border-accent bg-accent px-1.5 text-white" : "border-2 border-foreground px-1.5"}`}>
        {count}
      </span>
    </div>
  );
}

function TierSection({ heading, sub, rows, heavy, showDistrict }: { heading: string; sub: string; rows: Row[]; heavy?: boolean; showDistrict: boolean }) {
  return (
    <section className={`mb-10 ${heavy ? "border-2 border-accent bg-accent/5 p-3 sm:p-4" : ""}`}>
      <SectionHeading title={heading} count={rows.length} heavy={heavy} />
      <p className="mb-3 max-w-2xl font-mono text-[11px] text-foreground/60">{sub} Most overdue first.</p>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.caseId}>
              <Link
                href={`/cases/${c.caseId}`}
                className={`group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 bg-panel p-3 transition-colors hover:border-accent sm:grid-cols-[auto_1fr_auto_auto] ${
                  heavy ? "border-2 border-accent" : "border-2 border-foreground"
                }`}
              >
                <span className="font-mono text-xs text-foreground/50">#{c.rank}</span>
                <div className="min-w-0">
                  <p className="font-display text-sm break-words uppercase group-hover:text-accent">{c.personName}</p>
                  <p className="font-mono text-[11px] text-foreground/65">
                    {showDistrict && `${c.districtName} · `}
                    {c.governingSection}
                    {c.isGraded && " (graded)"} ·{" "}
                    {c.isFineOnly ? "fine only" : `${formatDays(c.daysInCustody)} ≥ ${formatDays(c.thresholdDays)} (${fractionLabel(c.applicableFraction)})`} ·{" "}
                    {STATUS_LABEL[c.caseStatus]}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.exclusionStatus === "STRICTER_SCRUTINY" && (
                      <span className="border border-accent px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">Stricter scrutiny</span>
                    )}
                    <DataSourceBadge source={c.dataSource} compact />
                    <CustodySourceBadge source={c.custodySource} compact />
                    {c.arrestDateIsProxy && <ArrestProxyBadge />}
                  </div>
                </div>
                <div className="text-right sm:order-last">
                  <p className={`font-display text-2xl leading-none sm:text-3xl ${heavy ? "text-accent" : ""}`}>{formatDays(c.overdueDays)}</p>
                  <p className="font-mono text-[9px] tracking-widest text-foreground/60 uppercase">days overdue</p>
                </div>
                <span className="hidden font-mono text-[10px] tracking-widest uppercase underline group-hover:text-accent sm:inline">Open →</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Empty() {
  return <p className="font-mono text-xs text-foreground/40 uppercase">Nothing here right now.</p>;
}
