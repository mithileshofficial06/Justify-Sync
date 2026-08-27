import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStateOverview } from "@/lib/queries/stateOverview";
import { Label, H1 } from "@/components/ui";

function pct(n: number | null) {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}

export default async function StateOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STATE_ADMIN") redirect("/");

  const districts = await getStateOverview();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Label>State legal services authority</Label>
      <div className="mt-1 mb-2">
        <H1>State overview</H1>
      </div>
      <p className="mb-8 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Coverage of cases this system has processed per district — not a share of total prison population.
      </p>

      <div className="overflow-x-auto border-2 border-foreground">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-foreground bg-foreground text-background">
              <Th>District</Th>
              <Th>Tracked</Th>
              <Th>Tier 1</Th>
              <Th>Tier 2</Th>
              <Th>Track B</Th>
              <Th>Needs review</Th>
              <Th>Filing rate</Th>
              <Th>Release rate</Th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.districtId} className="border-b border-foreground/20 last:border-0">
                <Td>
                  {d.districtName} <span className="text-foreground/40">({d.state})</span>
                </Td>
                <Td className="font-mono">{d.totalCasesTracked}</Td>
                <Td className="font-mono">{d.tier1}</Td>
                <Td className="font-mono">{d.tier2}</Td>
                <Td className="font-mono">{d.trackB}</Td>
                <Td className="font-mono">{d.needsReview}</Td>
                <Td className="font-mono">{pct(d.filingRate)}</Td>
                <Td className="font-mono">{pct(d.releaseRate)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-mono text-xs tracking-widest uppercase">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
