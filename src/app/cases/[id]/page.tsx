import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { getCaseDetail, ForbiddenError, NotFoundError } from "@/lib/queries/caseDetail";
import { formatDateDMY, formatDays } from "@/lib/engine/explain";
import { StatusActions, PipelineTools } from "@/components/CaseActions";
import { ManualOverride } from "@/components/ManualOverride";
import { ArithmeticPanel } from "@/components/case/ArithmeticPanel";
import { CustodyPanel, DecisionFlow, DraftsPanel, FactsPanel, StatusTimeline } from "@/components/case/CasePanels";
import { ActorPanel, ActorTag, ArrestProxyBadge, CustodySourceBadge, DataSourceBadge } from "@/components/case/Provenance";
import { Label, H1, Badge } from "@/components/ui";

const EXCLUSION_LABEL = {
  CLEAR: "Clear",
  EXCLUDED: "Excluded",
  STRICTER_SCRUTINY: "Stricter scrutiny",
  NEEDS_HUMAN_REVIEW: "Needs human review",
} as const;

const FACT_METHOD_LABEL: Record<string, string> = {
  AI_DOUBLE_PASS: "AI extraction, grounded, both passes agreed",
  PRECOMPUTED_FIXTURE: "pre-computed extraction, grounded",
  MANUAL_OVERRIDE: "lawyer's manual confirmation",
  SYNTHETIC_ASSUMPTION: "synthetic value — not in court metadata",
};

export default async function CaseDetailPage(props: PageProps<"/cases/[id]">) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await props.params;

  let c;
  try {
    c = await getCaseDetail(id, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/");
    throw error;
  }

  await logAudit({ actorUserId: session.userId, action: "view_case", entity: "Case", entityId: c.id });

  const fr = c.formulaResult;
  const tb = c.trackBFlag;
  const name = c.person.nameVariants[0] ?? "Unknown";
  const priorsFact = c.extractedFacts.find((f) => f.fieldName === "priorConvictions" && f.confidence >= 0.7);
  const ranked = Boolean(fr?.tier) && (c.exclusionStatus === "CLEAR" || c.exclusionStatus === "STRICTER_SCRUTINY");
  const inPipeline = ranked || Boolean(tb) || c.statusEvents.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Label>Case file · {c.district.name}</Label>
          <Link href="/" className="ml-auto font-mono text-[10px] tracking-widest uppercase underline hover:text-accent">
            ← Ranked list
          </Link>
        </div>
        <div className="mt-1 mb-3">
          <H1>{name}</H1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fr?.tier === "TIER_1" && <Badge tone="accent">Tier 1 · full term served</Badge>}
          {fr?.tier === "TIER_2" && <Badge>Tier 2 · threshold met</Badge>}
          {tb && <Badge tone="accent">Track B · surety failure</Badge>}
          {c.exclusionStatus !== "CLEAR" && <Badge tone="accent">{EXCLUSION_LABEL[c.exclusionStatus]}</Badge>}
          <DataSourceBadge source={c.dataSource} />
          <CustodySourceBadge source={c.custodySource} />
          {c.arrestDateIsProxy && <ArrestProxyBadge />}
        </div>
        <p className="mt-2 font-mono text-[11px] text-foreground/55">
          {c.person.approxAge ? `Age ~${c.person.approxAge} · ` : ""}
          {c.sourceDataset ?? "Source not recorded"}
          {c.dataSource === "ECOURTS_METADATA" && c.sourceRef ? ` · ref ${c.sourceRef}` : ""}
        </p>
      </header>

      <DecisionFlow />

      {c.exclusionStatus === "EXCLUDED" || c.exclusionStatus === "NEEDS_HUMAN_REVIEW" ? (
        <ActorPanel
          actor="RULES"
          title={c.exclusionStatus === "EXCLUDED" ? "Why this case is excluded" : "Why this case is waiting for a lawyer"}
          tag={<ActorTag actor="RULES">Exclusion check · fixed rule</ActorTag>}
        >
          <p className="font-mono text-sm leading-relaxed">{c.exclusionReason}</p>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-foreground/65">
            {c.exclusionStatus === "EXCLUDED"
              ? "Exclusions run before any arithmetic. This case is recorded and visible — it is routed out, not silently dropped."
              : "The engine will not guess. Once a lawyer confirms the missing fact (manual override below, or a better document), the arithmetic runs and the case is ranked."}
          </p>
          {c.chargedSections.length > 0 && (
            <p className="mt-3 font-mono text-[11px] text-foreground/65">
              Charged:{" "}
              {c.chargedSections.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/knowledge-base#${s.id}`} className="underline hover:text-accent">
                    {s.law} {s.code}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </ActorPanel>
      ) : fr ? (
        <>
          {c.exclusionStatus === "STRICTER_SCRUTINY" && (
            <div className="border-2 border-accent bg-panel p-4">
              <p className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">Stricter scrutiny — still ranked</p>
              <p className="mt-1 font-mono text-xs leading-relaxed">{c.exclusionReason}</p>
            </div>
          )}
          <ArithmeticPanel
            chargedSections={c.chargedSections}
            governingSection={fr.governingSection}
            applicableFraction={fr.applicableFraction}
            thresholdDays={fr.thresholdDays}
            daysInCustody={fr.daysInCustody}
            tier={fr.tier}
            overdueDays={fr.overdueDays}
            computedAt={fr.computedAt}
            arrestDate={c.arrestDate}
            arrestDateIsProxy={c.arrestDateIsProxy}
            custodyAsOf={c.custodyAsOf}
            priorConvictionsSynthetic={priorsFact?.method === "SYNTHETIC_ASSUMPTION"}
            arrestDateProxyNote={c.arrestDateProxyNote}
            priorConvictionsSource={priorsFact ? FACT_METHOD_LABEL[priorsFact.method] ?? priorsFact.method : null}
          />
        </>
      ) : (
        <div className="border-2 border-dashed border-foreground/40 p-4 font-mono text-xs text-foreground/60 uppercase">
          Not computed yet — extract facts or set the charged sections, then recompute.
        </div>
      )}

      {tb && (
        <ActorPanel actor="RULES" title="Track B — bail granted, still inside" tag={<ActorTag actor="RULES">Fixed rule · no sentencing law</ActorTag>}>
          <div className="overflow-x-auto border-2 border-foreground bg-background">
            <pre className="min-w-max p-4 font-mono text-[13px] leading-7 sm:text-sm">
              <div><span className="text-foreground/55">Bail order dated:    </span><span className="font-bold">{tb.bailOrderDate ? formatDateDMY(tb.bailOrderDate) : "not recorded — data-quality review"}</span></div>
              <div><span className="text-foreground/55">Custody status:      </span><span className="font-bold">{c.custodyStatus === "in_custody" ? "still in custody" : "released"}</span></div>
              <div><span className="text-foreground/55">Days since bail:     </span><span className="font-bold">{tb.daysSinceBail !== null ? formatDays(tb.daysSinceBail) : "unknown"}</span></div>
              <div className="my-2 border-t border-dashed border-foreground/40" />
              <div className="text-base font-bold sm:text-lg">{tb.daysSinceBail !== null ? `${formatDays(tb.daysSinceBail)}  >=  7` : "bail order date missing"}</div>
            </pre>
          </div>
          <div className="mt-3 border-2 border-accent bg-accent px-4 py-3 font-display text-lg leading-tight text-white uppercase">
            → Probable surety failure
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-foreground/70">
            A court has already found this person fit for bail. Seven days on, they are still inside — almost always because
            they cannot furnish surety. No sentencing law is needed to see it; a surety-modification application is drafted below.
          </p>
        </ActorPanel>
      )}

      <FactsPanel facts={c.extractedFacts} />

      <CustodyPanel custodyStatus={c.custodyStatus} custodySource={c.custodySource} bailGranted={c.bailGranted} bailOrderDate={c.bailOrderDate} />

      {inPipeline && (
        <DraftsPanel drafts={c.applications}>
          <StatusActions caseId={c.id} caseStatus={c.caseStatus} canUpdate={session.role === "LAWYER"} eligible={ranked || Boolean(tb)} />
        </DraftsPanel>
      )}

      <StatusTimeline events={c.statusEvents} currentStatus={c.caseStatus} statusUpdatedAt={c.statusUpdatedAt} />

      {c.potentialMatches.length > 0 && (
        <section className="border-2 border-accent bg-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base tracking-tight uppercase sm:text-lg">Possible same person</h2>
            <span className="ml-auto">
              <ActorTag actor="RULES">Name match · human confirms</ActorTag>
            </span>
          </div>
          <p className="mt-1 mb-3 font-mono text-[11px] leading-relaxed text-foreground/65">
            Records like this can belong to the same person under a different spelling. If they do, this person has
            more than one pending case and §479(2) applies. JuriSync never decides that on its own — it shows the
            candidates and a lawyer confirms or rejects them with the override below.
          </p>
          <ul className="flex flex-col gap-2">
            {c.potentialMatches.map((m) => (
              <li key={m.personId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-foreground/30 px-3 py-2 font-mono text-sm">
                <span className="font-bold">{m.matchedName}</span>
                {m.approxAge && <span className="text-foreground/55">age ~{m.approxAge}</span>}
                <span className="text-foreground/55">{Math.round(m.similarity * 100)}% name similarity</span>
                {m.caseIds.map((caseId) => (
                  <Link key={caseId} href={`/cases/${caseId}`} className="ml-auto text-xs tracking-widest uppercase underline hover:text-accent">
                    Open record →
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(session.role === "LAWYER" || session.role === "DISTRICT_ADMIN") && (
        <div className="flex flex-col gap-3">
          <PipelineTools caseId={c.id} />
          <details className="border-2 border-foreground/40">
            <summary className="cursor-pointer px-4 py-3 font-mono text-xs tracking-widest uppercase hover:text-accent">
              Manual override — confirm a fact the document could not
            </summary>
            <div className="border-t-2 border-foreground/20 p-4">
              <ManualOverride caseId={c.id} />
            </div>
          </details>
        </div>
      )}
    </main>
  );
}
