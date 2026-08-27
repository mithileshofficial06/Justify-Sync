import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCaseDetail, ForbiddenError, NotFoundError } from "@/lib/queries/caseDetail";
import { CaseActions } from "@/components/CaseActions";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  let dbCase;
  try {
    dbCase = await getCaseDetail(id, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/");
    throw error;
  }

  const fr = dbCase.formulaResult;
  const tb = dbCase.trackBFlag;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">{dbCase.person.nameVariants[0] ?? "Unknown"}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Status: {dbCase.caseStatus} · Exclusion: {dbCase.exclusionStatus}
        {dbCase.exclusionReason && <span> — {dbCase.exclusionReason}</span>}
      </p>

      <section className="mb-6 rounded border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <h2 className="mb-3 font-medium">Explainability — check the arithmetic yourself</h2>
        {fr ? (
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-neutral-500">Governing section</dt>
            <dd>{fr.governingSection.code}</dd>
            <dt className="text-neutral-500">Applicable fraction</dt>
            <dd>{Math.abs(fr.applicableFraction - 1 / 3) < 0.001 ? "1/3 (no priors)" : "1/2 (has prior conviction)"}</dd>
            <dt className="text-neutral-500">Threshold (days)</dt>
            <dd>{fr.thresholdDays}</dd>
            <dt className="text-neutral-500">Days in custody</dt>
            <dd>{fr.daysInCustody}</dd>
            <dt className="text-neutral-500">Tier</dt>
            <dd className="font-medium">{fr.tier ?? "not yet eligible"}</dd>
            <dt className="text-neutral-500">Overdue days</dt>
            <dd className="font-medium">{fr.overdueDays ?? "—"}</dd>
          </dl>
        ) : (
          <p className="text-neutral-400">Not computed yet — run &quot;Compute eligibility&quot; below.</p>
        )}

        {tb && (
          <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <p className="font-medium">Track B — surety failure flag</p>
            <p className="text-neutral-500">
              Bail order: {tb.bailOrderDate?.toDateString() ?? "unknown"} · Days since: {tb.daysSinceBail ?? "unknown"}
            </p>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium">Extracted facts (grounded)</h2>
        {dbCase.extractedFacts.length === 0 ? (
          <p className="text-sm text-neutral-400">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {dbCase.extractedFacts.map((f) => (
              <li key={f.id} className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
                <p>
                  <span className="font-medium">{f.fieldName}</span>: {f.value}{" "}
                  <span className={f.confidence >= 0.7 ? "text-green-600" : "text-amber-600"}>
                    (confidence {f.confidence.toFixed(1)})
                  </span>
                </p>
                <p className="mt-1 text-xs text-neutral-500">&quot;{f.sourceSentence}&quot;</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium">Drafted applications</h2>
        {dbCase.applications.length === 0 ? (
          <p className="text-sm text-neutral-400">None yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {dbCase.applications.map((a) => (
              <pre key={a.id} className="whitespace-pre-wrap rounded border border-neutral-200 p-3 text-xs dark:border-neutral-800">
                {a.draftText}
              </pre>
            ))}
          </div>
        )}
      </section>

      <CaseActions caseId={dbCase.id} />
    </main>
  );
}
