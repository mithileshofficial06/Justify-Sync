import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getRankedList } from "@/lib/queries/rankedList";

function fractionLabel(f: number) {
  return Math.abs(f - 1 / 3) < 0.001 ? "1/3" : Math.abs(f - 1 / 2) < 0.001 ? "1/2" : f.toFixed(2);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { trackA, trackB } = await getRankedList(session);
  const tier1 = trackA.filter((c) => c.tier === 1);
  const tier2 = trackA.filter((c) => c.tier === 2);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">Ranked list</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Tier 1 — served the full statutory term — ranks above Tier 2. Within each tier, most overdue first.
      </p>

      <Section title={`Tier 1 — full term served (${tier1.length})`} emphasized>
        {tier1.length === 0 ? <Empty /> : <Table rows={tier1} />}
      </Section>

      <Section title={`Tier 2 — threshold met (${tier2.length})`}>
        {tier2.length === 0 ? <Empty /> : <Table rows={tier2} />}
      </Section>

      <Section title={`Track B — bail granted, not released (${trackB.length})`}>
        {trackB.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                  <th className="py-2 pr-4">Person</th>
                  <th className="py-2 pr-4">Days since bail</th>
                  <th className="py-2 pr-4">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {trackB.map((c) => (
                  <tr key={c.caseId} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 pr-4">{c.personName}</td>
                    <td className="py-2 pr-4">{c.daysSinceBail ?? "unknown — data quality review"}</td>
                    <td className="py-2 pr-4">{c.caseStatus}</td>
                    <td className="py-2">
                      <Link href={`/cases/${c.caseId}`} className="text-blue-600 hover:underline dark:text-blue-400">
                        Open
                      </Link>
                    </td>
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

function Section({ title, emphasized, children }: { title: string; emphasized?: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className={`mb-2 text-sm font-medium ${emphasized ? "text-red-700 dark:text-red-400" : "text-neutral-700 dark:text-neutral-300"}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-neutral-400">Nothing here right now.</p>;
}

function Table({ rows }: { rows: Awaited<ReturnType<typeof getRankedList>>["trackA"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2 pr-4">Person</th>
            <th className="py-2 pr-4">Section</th>
            <th className="py-2 pr-4">Fraction</th>
            <th className="py-2 pr-4">Overdue days</th>
            <th className="py-2 pr-4">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.caseId} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4">{c.personName}</td>
              <td className="py-2 pr-4">{c.governingSection}</td>
              <td className="py-2 pr-4">{fractionLabel(c.applicableFraction)}</td>
              <td className="py-2 pr-4 font-medium">{c.overdueDays}</td>
              <td className="py-2 pr-4">{c.caseStatus}</td>
              <td className="py-2">
                <Link href={`/cases/${c.caseId}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
