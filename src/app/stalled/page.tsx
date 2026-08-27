import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getStalledCases } from "@/lib/queries/stalled";
import { Label, H1 } from "@/components/ui";

export default async function StalledPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stalled = await getStalledCases(session);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Label>Accountability loop</Label>
      <div className="mt-1 mb-2">
        <H1>Stalled cases</H1>
      </div>
      <p className="mb-8 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Not filed 30+ days after identification, no hearing 60+ days after filing, or not released 7+ days after bail was granted.
      </p>

      {stalled.length === 0 ? (
        <p className="font-mono text-xs text-foreground/40 uppercase">Nothing stalled right now.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stalled.map((s) => (
            <li key={s.caseId} className="border-2 border-accent bg-panel p-4">
              <p className="font-display text-sm uppercase">{s.personName}</p>
              <p className="mt-1 font-mono text-xs text-foreground/70">
                {s.status} since {s.statusUpdatedAt.toDateString()} — {s.reason}
              </p>
              <Link
                href={`/cases/${s.caseId}`}
                className="mt-2 inline-block font-mono text-xs tracking-widest uppercase underline hover:text-accent"
              >
                Open case →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
