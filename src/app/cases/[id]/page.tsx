import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCaseDetail, ForbiddenError, NotFoundError } from "@/lib/queries/caseDetail";
import { CaseActions } from "@/components/CaseActions";
import { ManualOverride } from "@/components/ManualOverride";
import { Label, H1, H2, Badge, Panel } from "@/components/ui";

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Label>Case file</Label>
      <div className="mt-1 mb-2">
        <H1>{dbCase.person.nameVariants[0] ?? "Unknown"}</H1>
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge>{dbCase.caseStatus}</Badge>
        <Badge tone={dbCase.exclusionStatus === "CLEAR" ? "default" : "accent"}>{dbCase.exclusionStatus}</Badge>
        {dbCase.exclusionReason && (
          <span className="font-mono text-xs text-foreground/60">{dbCase.exclusionReason}</span>
        )}
      </div>

      <Panel className="mb-8 p-5">
        <div className="mb-4">
          <H2>Explainability</H2>
        </div>
        {fr ? (
          <dl className="grid grid-cols-2 gap-y-3 font-mono text-sm">
            <Field label="Governing section" value={fr.governingSection.code} />
            <Field
              label="Applicable fraction"
              value={Math.abs(fr.applicableFraction - 1 / 3) < 0.001 ? "1/3 (no priors)" : "1/2 (has prior)"}
            />
            <Field label="Threshold (days)" value={String(fr.thresholdDays)} />
            <Field label="Days in custody" value={String(fr.daysInCustody)} />
            <Field label="Tier" value={fr.tier ?? "not yet eligible"} emphasize />
            <Field label="Overdue days" value={fr.overdueDays !== null ? String(fr.overdueDays) : "—"} emphasize />
          </dl>
        ) : (
          <p className="font-mono text-xs text-foreground/40 uppercase">Not computed yet — run &quot;Compute eligibility&quot; below.</p>
        )}

        {tb && (
          <div className="mt-5 border-t-2 border-foreground pt-4">
            <p className="mb-1 font-mono text-xs tracking-widest uppercase">Track B — surety failure flag</p>
            <p className="font-mono text-sm">
              Bail order: {tb.bailOrderDate?.toDateString() ?? "unknown"} · Days since: {tb.daysSinceBail ?? "unknown"}
            </p>
          </div>
        )}
      </Panel>

      <section className="mb-8">
        <div className="mb-3 border-b-2 border-foreground pb-2">
          <H2>Extracted facts (grounded)</H2>
        </div>
        {dbCase.extractedFacts.length === 0 ? (
          <p className="font-mono text-xs text-foreground/40 uppercase">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dbCase.extractedFacts.map((f) => (
              <li key={f.id} className="border-2 border-foreground p-3">
                <p className="font-mono text-sm">
                  <span className="font-bold">{f.fieldName}</span>: {f.value}{" "}
                  <span className={f.confidence >= 0.7 ? "text-green-700" : "text-accent"}>
                    (confidence {f.confidence.toFixed(1)})
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs text-foreground/50">&quot;{f.sourceSentence}&quot;</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 border-b-2 border-foreground pb-2">
          <H2>Drafted applications</H2>
        </div>
        {dbCase.applications.length === 0 ? (
          <p className="font-mono text-xs text-foreground/40 uppercase">None yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {dbCase.applications.map((a) => (
              <pre key={a.id} className="border-2 border-foreground bg-panel p-4 font-mono text-xs whitespace-pre-wrap">
                {a.draftText}
              </pre>
            ))}
          </div>
        )}
      </section>

      <div className="mb-8">
        <CaseActions caseId={dbCase.id} />
      </div>

      <ManualOverride caseId={dbCase.id} />
    </main>
  );
}

function Field({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <>
      <dt className="text-foreground/50 uppercase">{label}</dt>
      <dd className={emphasize ? "text-lg font-bold" : ""}>{value}</dd>
    </>
  );
}
