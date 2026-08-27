import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getNeedsReviewCases } from "@/lib/queries/needsReview";
import { Label, H1, Badge } from "@/components/ui";

export default async function NeedsReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cases = await getNeedsReviewCases(session);
  const needsReview = cases.filter((c) => c.exclusionStatus === "NEEDS_HUMAN_REVIEW");
  const excluded = cases.filter((c) => c.exclusionStatus === "EXCLUDED");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Label>Cases the engine would not silently rank</Label>
      <div className="mt-1 mb-2">
        <H1>Needs review</H1>
      </div>
      <p className="mb-8 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Nothing here was dropped — it was routed here instead. Resolve it on the case page (extract
        better facts, or use the manual override) to get it ranked.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 border-b-2 border-foreground pb-2 font-display text-lg uppercase">
          Needs human review ({needsReview.length})
        </h2>
        {needsReview.length === 0 ? (
          <Empty />
        ) : (
          <List cases={needsReview} />
        )}
      </section>

      <section>
        <h2 className="mb-3 border-b-2 border-foreground pb-2 font-display text-lg uppercase">
          Excluded ({excluded.length})
        </h2>
        {excluded.length === 0 ? <Empty /> : <List cases={excluded} />}
      </section>
    </main>
  );
}

function Empty() {
  return <p className="font-mono text-xs text-foreground/40 uppercase">None right now.</p>;
}

function List({ cases }: { cases: Awaited<ReturnType<typeof getNeedsReviewCases>> }) {
  return (
    <ul className="flex flex-col gap-2">
      {cases.map((c) => (
        <li key={c.caseId} className="border-2 border-foreground bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm uppercase">{c.personName}</p>
            <Badge tone={c.exclusionStatus === "EXCLUDED" ? "accent" : "default"}>{c.exclusionStatus}</Badge>
          </div>
          {c.exclusionReason && <p className="mt-2 font-mono text-xs text-foreground/60">{c.exclusionReason}</p>}
          <Link
            href={`/cases/${c.caseId}`}
            className="mt-2 inline-block font-mono text-xs tracking-widest uppercase underline hover:text-accent"
          >
            Open case →
          </Link>
        </li>
      ))}
    </ul>
  );
}
