import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getStalledCases } from "@/lib/queries/stalled";

export default async function StalledPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stalled = await getStalledCases(session);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">Stalled cases</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Own filings that have gone quiet — not filed 30+ days after identification, no hearing 60+ days after filing, or not released 7+ days after bail was granted.
      </p>

      {stalled.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing stalled right now.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {stalled.map((s) => (
            <li key={s.caseId} className="rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="font-medium">{s.personName}</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                {s.status} since {s.statusUpdatedAt.toDateString()} — {s.reason}
              </p>
              <Link href={`/cases/${s.caseId}`} className="text-blue-600 hover:underline dark:text-blue-400">
                Open case
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
