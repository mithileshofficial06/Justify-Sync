import Link from "next/link";
import { getRankedList } from "@/lib/queries/rankedList";
import type { SessionClaims } from "@/lib/auth/jwt";
import { formatDateDMY, formatDays, fractionLabel } from "@/lib/engine/explain";
import { ArrestProxyBadge, CustodySourceBadge, DataSourceBadge } from "@/components/case/Provenance";
import { DashboardHero, RowList, SectionTitle, TrackBRow, WorklistRow } from "@/components/dashboard/DashboardParts";

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

  const provenance = (
    <>
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
    </>
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <DashboardHero
        userName={header.userName}
        districtName={header.districtName}
        date={formatDateDMY(new Date())}
        scanned={header.scanned}
        tier1={header.tier1}
        tier2={header.tier2}
        trackB={trackB.length}
        notYet={header.notYet}
        review={header.review}
        provenance={
          <>
            <span className="sr-only">Undertrials scanned {header.scanned}. Eligible today {header.eligible}. </span>
            {provenance}
          </>
        }
      />

      <TierSection
        heading="Tier 1 — held longer than the maximum sentence"
        sub="These people have already been detained longer than the longest sentence the court could give them for the governing charge. Most overdue first."
        rows={tier1}
        heavy
        showDistrict={showDistrict}
      />

      <TierSection
        heading="Tier 2 — statutory threshold crossed"
        sub="Custody has passed the applicable fraction of the maximum sentence (1/3 for a first-time offender, 1/2 otherwise). §479 BNSS says they shall be released. Most overdue first."
        rows={tier2}
        showDistrict={showDistrict}
      />

      <section className="mb-10">
        <SectionTitle
          title="Track B — bail granted, still inside"
          sub="A court has already granted bail. Seven or more days later they have not walked out — almost always a surety problem. No sentencing law needed."
          count={trackB.length}
        />
        {trackB.length === 0 ? (
          <Empty />
        ) : (
          <RowList>
            {trackB.map((c) => (
              <TrackBRow
                key={c.caseId}
                href={`/cases/${c.caseId}`}
                name={c.personName}
                meta={`${showDistrict ? `${c.districtName} · ` : ""}Bail ordered ${c.bailOrderDate ? formatDateDMY(c.bailOrderDate) : "— date missing"} · still in custody · surety draft ready`}
                daysSinceBail={c.daysSinceBail}
                badges={
                  <>
                    <DataSourceBadge source={c.dataSource} compact />
                    <CustodySourceBadge source={c.custodySource} compact />
                  </>
                }
              />
            ))}
          </RowList>
        )}
      </section>
    </main>
  );
}

function TierSection({ heading, sub, rows, heavy, showDistrict }: { heading: string; sub: string; rows: Row[]; heavy?: boolean; showDistrict: boolean }) {
  return (
    <section className={`mb-10 ${heavy ? "border-2 border-accent bg-accent/5 p-3 sm:p-4" : ""}`}>
      <SectionTitle title={heading} sub={sub} count={rows.length} heavy={heavy} />
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <RowList>
          {rows.map((c) => (
            <WorklistRow
              key={c.caseId}
              href={`/cases/${c.caseId}`}
              rank={c.rank}
              heavy={heavy}
              name={c.personName}
              meta={[
                showDistrict ? c.districtName : null,
                `${c.governingSection}${c.isGraded ? " (graded)" : ""}`,
                c.isFineOnly ? "fine only" : `${formatDays(c.daysInCustody)} ≥ ${formatDays(c.thresholdDays)} (${fractionLabel(c.applicableFraction)})`,
                STATUS_LABEL[c.caseStatus],
              ]
                .filter(Boolean)
                .join(" · ")}
              overdueDays={c.overdueDays}
              daysInCustody={c.daysInCustody}
              thresholdDays={c.thresholdDays}
              maxSentenceDays={c.maxSentenceDays}
              isFineOnly={c.isFineOnly}
              badges={
                <>
                  {c.exclusionStatus === "STRICTER_SCRUTINY" && (
                    <span className="border border-accent px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">Stricter scrutiny</span>
                  )}
                  <DataSourceBadge source={c.dataSource} compact />
                  <CustodySourceBadge source={c.custodySource} compact />
                  {c.arrestDateIsProxy && <ArrestProxyBadge />}
                </>
              }
            />
          ))}
        </RowList>
      )}
    </section>
  );
}

function Empty() {
  return <p className="font-mono text-xs text-foreground/40 uppercase">Nothing here right now.</p>;
}
