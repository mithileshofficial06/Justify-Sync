import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStateOverview } from "@/lib/queries/stateOverview";

function pct(n: number | null) {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}

export default async function StateOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STATE_ADMIN") redirect("/");

  const districts = await getStateOverview();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">State overview</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Coverage of cases this system has processed, per district — not a share of total prison population (that needs e-Prisons integration, not yet wired up).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <th className="py-2 pr-4">District</th>
              <th className="py-2 pr-4">Tracked</th>
              <th className="py-2 pr-4">Tier 1</th>
              <th className="py-2 pr-4">Tier 2</th>
              <th className="py-2 pr-4">Track B</th>
              <th className="py-2 pr-4">Needs review</th>
              <th className="py-2 pr-4">Filing rate</th>
              <th className="py-2 pr-4">Release rate</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.districtId} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 pr-4">
                  {d.districtName} <span className="text-neutral-400">({d.state})</span>
                </td>
                <td className="py-2 pr-4">{d.totalCasesTracked}</td>
                <td className="py-2 pr-4">{d.tier1}</td>
                <td className="py-2 pr-4">{d.tier2}</td>
                <td className="py-2 pr-4">{d.trackB}</td>
                <td className="py-2 pr-4">{d.needsReview}</td>
                <td className="py-2 pr-4">{pct(d.filingRate)}</td>
                <td className="py-2 pr-4">{pct(d.releaseRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
