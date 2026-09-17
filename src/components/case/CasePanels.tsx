import { formatDateDMY, formatDays } from "@/lib/engine/explain";
import { ActorPanel, ActorTag, type Actor } from "./Provenance";

export function DecisionFlow() {
  const steps: { actor: Actor; title: string; body: string }[] = [
    { actor: "AI", title: "1 · AI reads", body: "Pulls dates, sections and antecedents out of the document. Every fact must quote its source sentence or it is thrown away." },
    { actor: "RULES", title: "2 · Fixed rules decide", body: "Exclusions, threshold and tier are plain arithmetic on the knowledge base. No AI touches this step." },
    { actor: "LAWYER", title: "3 · A lawyer signs", body: "Counsel reviews, signs and files. JuriSync never files anything with a court." },
  ];
  return (
    <div className="grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.title} className="bg-panel p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-display text-xs uppercase">{s.title}</span>
            <ActorTag actor={s.actor} />
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-foreground/65">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = {
  arrestDate: "Arrest date",
  chargedSections: "Charged sections",
  priorConvictions: "Prior conviction",
  otherPendingCases: "Other pending cases",
  bailOrder: "Bail order",
};

const EXPECTED_FIELDS = ["chargedSections", "arrestDate", "priorConvictions", "otherPendingCases"] as const;

function humanValue(fieldName: string, value: string) {
  if (fieldName === "priorConvictions") return value === "false" ? "None on record" : value === "true" ? "Previously convicted" : value;
  if (fieldName === "otherPendingCases") return value === "false" ? "None" : value === "true" ? "Yes" : "Unclear";
  if (fieldName === "arrestDate" || fieldName === "bailOrder") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatDateDMY(d);
  }
  return value;
}

export interface FactRow {
  id: string;
  fieldName: string;
  value: string;
  sourceSentence: string;
  confidence: number;
  method: string;
  extractedAt: Date;
  undecryptable?: boolean;
}

function confidenceTag(f: FactRow) {
  if (f.method === "MANUAL_OVERRIDE") return { text: "Asserted by lawyer · not from a document", className: "border-lawyer text-lawyer" };
  if (f.method === "COURT_METADATA") return { text: "From public court metadata · not AI", className: "border-lawyer text-lawyer" };
  if (f.method === "SYNTHETIC_ASSUMPTION") return { text: "Synthetic value · court metadata has no such field", className: "border-accent text-accent" };
  if (f.confidence < 0.7) return { text: `Low confidence ${f.confidence.toFixed(1)} · passes disagreed — not used`, className: "border-accent text-accent" };
  if (f.method === "PRECOMPUTED_FIXTURE")
    return { text: `High confidence ${f.confidence.toFixed(1)} · pre-computed, passes live grounding check`, className: "border-ai text-ai" };
  return { text: `High confidence ${f.confidence.toFixed(1)} · both AI passes agreed`, className: "border-ai text-ai" };
}

export function FactsPanel({ facts }: { facts: FactRow[] }) {
  const latest = new Map<string, FactRow>();
  for (const f of facts) if (!latest.has(f.fieldName)) latest.set(f.fieldName, f);
  const shown = [...latest.values()];
  const missing = EXPECTED_FIELDS.filter((field) => !latest.has(field));
  const fixtureOnly = shown.length > 0 && shown.every((f) => f.method === "PRECOMPUTED_FIXTURE");
  const noDocument = shown.length > 0 && shown.every((f) => f.method === "COURT_METADATA" || f.method === "SYNTHETIC_ASSUMPTION");

  if (noDocument) {
    return (
      <ActorPanel actor="RULES" title="Where the facts came from" tag={<ActorTag actor="RULES">Court metadata · no AI</ActorTag>}>
        <p className="mb-4 font-mono text-[11px] leading-relaxed text-foreground/70">
          This case was loaded from public court metadata, not read from a document. Every value says whether it came
          from the court record or is a labelled synthetic stand-in for a field court metadata does not contain.
        </p>
        <FactList facts={shown} />
      </ActorPanel>
    );
  }

  return (
    <ActorPanel actor="AI" title="What was read from the document" tag={<ActorTag actor="AI">AI read · grounded</ActorTag>}>
      <p className="mb-4 font-mono text-[11px] leading-relaxed text-foreground/70">
        Each fact below quotes the exact sentence it came from. A fact whose quote is not in the document, is cut
        off mid-sentence, or is hedged (&ldquo;however&hellip; awaited&rdquo;) is discarded — never guessed.
        {fixtureOnly && " For this demo case the reading was pre-computed, so no live AI call is needed."}
      </p>
      {shown.length === 0 ? <p className="font-mono text-xs text-foreground/50 uppercase">No facts extracted yet.</p> : <FactList facts={shown} />}
      {missing.length > 0 && (
        <div className="mt-4 border-2 border-accent/60 bg-background p-3">
          <p className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">Could not be grounded</p>
          <ul className="mt-1 list-disc pl-5 font-mono text-[11px] text-foreground/75">
            {missing.map((m) => (
              <li key={m}>
                {FIELD_LABEL[m]} — no complete, unqualified sentence supports it, so it is left blank rather than assumed.
              </li>
            ))}
          </ul>
        </div>
      )}
    </ActorPanel>
  );
}

function FactList({ facts }: { facts: FactRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {facts.map((f) => {
        const tag = confidenceTag(f);
        return (
          <li key={f.id} className="border-2 border-dashed border-ai/60 bg-background p-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[10px] tracking-widest text-foreground/55 uppercase">{FIELD_LABEL[f.fieldName] ?? f.fieldName}</span>
              <span className="font-mono text-sm font-bold">{f.undecryptable ? "—" : humanValue(f.fieldName, f.value)}</span>
              <span className={`ml-auto border px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase ${tag.className}`}>{tag.text}</span>
            </div>
            <blockquote className="mt-2 border-l-4 border-ai/60 pl-3 font-serif text-[13px] leading-relaxed text-foreground/80 italic">
              &ldquo;{f.sourceSentence}&rdquo;
            </blockquote>
          </li>
        );
      })}
    </ul>
  );
}

export function CustodyPanel({
  custodyStatus,
  custodySource,
  bailGranted,
  bailOrderDate,
}: {
  custodyStatus: string;
  custodySource: "SIMULATED" | "EPRISONS";
  bailGranted: boolean;
  bailOrderDate: Date | null;
}) {
  const inCustody = custodyStatus === "in_custody";
  return (
    <section className="border-2 border-foreground bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground/15 px-4 py-3">
        <h2 className="font-display text-base tracking-tight uppercase sm:text-lg">Custody status</h2>
        <span className="ml-auto border-2 border-dashed border-foreground/60 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase">
          e-Prisons adapter
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
        <div className={`border-2 px-4 py-3 text-center ${inCustody ? "border-accent" : "border-lawyer"}`}>
          <p className="font-mono text-[10px] tracking-widest text-foreground/60 uppercase">Status</p>
          <p className={`font-display text-xl uppercase ${inCustody ? "text-accent" : "text-lawyer"}`}>{inCustody ? "In custody" : "Released"}</p>
          {bailGranted && bailOrderDate && (
            <p className="mt-1 font-mono text-[10px] text-foreground/60">Bail ordered {formatDateDMY(bailOrderDate)}</p>
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 self-center font-mono text-[11px]">
          <dt className="text-foreground/55 uppercase">Source</dt>
          <dd className="font-bold">{custodySource === "EPRISONS" ? "NPIP e-Prisons feed" : "Simulated — e-Prisons adapter awaiting institutional access"}</dd>
          <dt className="text-foreground/55 uppercase">Last synced</dt>
          <dd>{custodySource === "EPRISONS" ? "—" : "Not connected"}</dd>
          <dt className="text-foreground/55 uppercase">Why</dt>
          <dd className="text-foreground/75">
            Custody status is authoritative only from the prison system. The adapter interface is built; access to
            e-Prisons requires an institutional agreement, so this value comes from the case record and is marked
            simulated (v4 Flaw #9).
          </dd>
        </dl>
      </div>
    </section>
  );
}

export interface DraftRow {
  id: string;
  type: string;
  draftText: string;
  generator: string;
  generatedAt: Date;
}

export function DraftsPanel({ drafts, children }: { drafts: DraftRow[]; children?: React.ReactNode }) {
  return (
    <ActorPanel actor="AI" title="Pre-generated application" tag={<ActorTag actor="AI">Drafted · not filed</ActorTag>}>
      <p className="mb-3 border-2 border-foreground bg-background px-3 py-2 font-mono text-[11px] leading-relaxed">
        <span className="font-bold">There is no &ldquo;submit to court&rdquo; action anywhere in JuriSync.</span> Counsel reviews
        and signs the draft, files it in person or through e-filing, and then marks it as filed here.
      </p>
      {drafts.length === 0 ? (
        <p className="font-mono text-xs text-foreground/50 uppercase">No draft — only eligible or Track B cases get one.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((a, i) => (
            <details key={a.id} open={i === 0} className="border-2 border-foreground">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 bg-foreground px-3 py-2 font-mono text-[11px] tracking-widest text-background uppercase">
                <span className="font-bold">{a.type === "surety" ? "Surety-modification application" : "§479 release application"}</span>
                <span className="opacity-70">
                  · {a.generator === "TEMPLATE" ? "pre-generated from the computed facts" : "AI-drafted from the computed facts"} · {formatDateDMY(a.generatedAt)}
                </span>
              </summary>
              <pre className="max-h-96 overflow-auto bg-background p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{a.draftText}</pre>
            </details>
          ))}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </ActorPanel>
  );
}

const PIPELINE = ["IDENTIFIED", "DELIVERED", "FILED", "HEARD", "BAIL_GRANTED", "RELEASED"] as const;
const STATUS_LABEL: Record<string, string> = {
  IDENTIFIED: "Identified",
  DELIVERED: "Delivered to lawyer",
  FILED: "Filed",
  HEARD: "Heard",
  BAIL_GRANTED: "Bail granted",
  RELEASED: "Released",
};

export interface TimelineEvent {
  id: string;
  status: string;
  source: "SYSTEM" | "ECOURTS" | "LAWYER";
  note: string | null;
  eventTime: Date;
  setByUser: { fullName: string } | null;
}

export function StatusTimeline({ events, currentStatus, statusUpdatedAt }: { events: TimelineEvent[]; currentStatus: string; statusUpdatedAt: Date }) {
  const reached = new Set(events.map((e) => e.status));
  const daysSince = Math.floor((Date.now() - statusUpdatedAt.getTime()) / 86_400_000);
  return (
    <section className="border-2 border-foreground bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground/15 px-4 py-3">
        <h2 className="font-display text-base tracking-tight uppercase sm:text-lg">Status timeline</h2>
        <span className="ml-auto font-mono text-[10px] tracking-widest text-foreground/60 uppercase">
          {events.length > 0 ? `${STATUS_LABEL[currentStatus]} · ${formatDays(daysSince)} days ago` : "Not in the filing pipeline"}
        </span>
      </div>
      <div className="p-4">
        <ol className="mb-4 flex flex-wrap gap-1">
          {PIPELINE.map((s) => (
            <li
              key={s}
              className={`border-2 px-2 py-1 font-mono text-[9px] tracking-widest uppercase ${
                s === currentStatus && events.length > 0
                  ? "border-accent bg-accent text-white"
                  : reached.has(s)
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/20 text-foreground/40"
              }`}
            >
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
        {events.length === 0 ? (
          <p className="font-mono text-xs text-foreground/50 uppercase">
            No transitions yet — a case enters the pipeline when the daily sweep identifies it as eligible or a bail order is recorded.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l-2 border-foreground/30 pl-5">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute top-1.5 -left-[27px] h-3 w-3 border-2 border-foreground bg-panel" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase">{STATUS_LABEL[e.status] ?? e.status}</span>
                  <span className="font-mono text-[11px] text-foreground/60">{formatDateDMY(e.eventTime)}</span>
                  <ActorTag actor={e.source}>
                    {e.source === "LAWYER" ? `Lawyer${e.setByUser ? ` · ${e.setByUser.fullName}` : ""}` : e.source === "ECOURTS" ? "eCourts" : "System"}
                  </ActorTag>
                </div>
                {e.note && <p className="mt-0.5 font-mono text-[11px] text-foreground/65">{e.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
