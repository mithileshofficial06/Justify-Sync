import Link from "next/link";
import { getRankedList } from "@/lib/queries/rankedList";
import type { SessionClaims } from "@/lib/auth/jwt";
import { Label, H1, Badge } from "@/components/ui";

function fractionLabel(f: number) {
  return Math.abs(f - 1 / 3) < 0.001 ? "1/3" : Math.abs(f - 1 / 2) < 0.001 ? "1/2" : f.toFixed(2);
}

export async function RankedListDashboard({ session }: { session: SessionClaims }) {
  const { trackA, trackB } = await getRankedList(session);
  const tier1 = trackA.filter((c) => c.tier === 1);
  const tier2 = trackA.filter((c) => c.tier === 2);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Label>Daily, not quarterly</Label>
      <div className="mt-1 mb-2">
        <H1>Ranked list</H1>
      </div>
      <p className="mb-10 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Tier 1 ranks above Tier 2. Within each tier, most overdue first.
      </p>

      <Section title="Tier 1 — full term served" count={tier1.length} accent>
        {tier1.length === 0 ? <Empty /> : <Table rows={tier1} />}
      </Section>

      <Section title="Tier 2 — threshold met" count={tier2.length}>
        {tier2.length === 0 ? <Empty /> : <Table rows={tier2} />}
      </Section>

      <Section title="Track B — bail granted, not released" count={trackB.length}>
        {trackB.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto border-2 border-foreground">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground bg-foreground text-background">
                  <Th>Person</Th>
                  <Th>Days since bail</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {trackB.map((c) => (
                  <tr key={c.caseId} className="border-b border-foreground/20 last:border-0">
                    <Td>{c.personName}</Td>
                    <Td className="font-mono">{c.daysSinceBail ?? "unknown — review"}</Td>
                    <Td>
                      <Badge>{c.caseStatus}</Badge>
                    </Td>
                    <Td>
                      <Link href={`/cases/${c.caseId}`} className="font-mono text-xs tracking-widest uppercase underline hover:text-accent">
                        Open →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline gap-3 border-b-2 border-foreground pb-2">
        <h2 className="font-display text-lg tracking-tight uppercase">{title}</h2>
        <span
          className={`font-mono text-xs ${accent ? "border-2 border-accent bg-accent px-1.5 text-white" : "border-2 border-foreground px-1.5"}`}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="font-mono text-xs text-foreground/40 uppercase">Nothing here right now.</p>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-mono text-xs tracking-widest uppercase">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function Table({ rows }: { rows: Awaited<ReturnType<typeof getRankedList>>["trackA"] }) {
  return (
    <div className="overflow-x-auto border-2 border-foreground">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-foreground bg-foreground text-background">
            <Th>Person</Th>
            <Th>Section</Th>
            <Th>Fraction</Th>
            <Th>Overdue days</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.caseId} className="border-b border-foreground/20 last:border-0">
              <Td>{c.personName}</Td>
              <Td className="font-mono">{c.governingSection}</Td>
              <Td className="font-mono">{fractionLabel(c.applicableFraction)}</Td>
              <Td className="font-mono text-lg font-bold">{c.overdueDays}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Badge>{c.caseStatus}</Badge>
                  {c.exclusionStatus === "STRICTER_SCRUTINY" && <Badge tone="accent">Stricter scrutiny</Badge>}
                </div>
              </Td>
              <Td>
                <Link href={`/cases/${c.caseId}`} className="font-mono text-xs tracking-widest uppercase underline hover:text-accent">
                  Open →
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
