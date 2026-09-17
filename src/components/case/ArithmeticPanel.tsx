import Link from "next/link";
import { explainDecision, formatDays, formatDateDMY, type ExplainSection } from "@/lib/engine/explain";
import { ActorPanel, ActorTag } from "./Provenance";
import { AnimatedDerivation, CustodyMeter, OrderingBars } from "./AnimatedDerivation";

export interface ArithmeticPanelProps {
  chargedSections: (ExplainSection & { id: string })[];
  governingSection: ExplainSection & { id: string; version: string; citation: string | null };
  applicableFraction: number;
  thresholdDays: number;
  daysInCustody: number;
  tier: "TIER_1" | "TIER_2" | null;
  overdueDays: number | null;
  computedAt: Date;
  arrestDate: Date;
  arrestDateIsProxy: boolean;
  custodyAsOf: Date | null;
  priorConvictionsSynthetic: boolean;
  arrestDateProxyNote: string | null;
  priorConvictionsSource: string | null;
}

export function ArithmeticPanel(props: ArithmeticPanelProps) {
  const d = explainDecision({
    chargedSections: props.chargedSections,
    governingSection: props.governingSection,
    applicableFraction: props.applicableFraction,
    thresholdDays: props.thresholdDays,
    daysInCustody: props.daysInCustody,
    tier: props.tier === "TIER_1" ? 1 : props.tier === "TIER_2" ? 2 : null,
    overdueDays: props.overdueDays,
    arrestDate: props.arrestDate,
    arrestDateIsProxy: props.arrestDateIsProxy,
    custodyAsOf: props.custodyAsOf,
    priorConvictionsSynthetic: props.priorConvictionsSynthetic,
  });

  const verdictClass =
    d.verdictTone === "tier1"
      ? "bg-accent text-white border-accent"
      : d.verdictTone === "tier2"
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-foreground border-foreground";


  return (
    <ActorPanel actor="RULES" title="The arithmetic" tag={<ActorTag actor="RULES">Fixed rule · no AI</ActorTag>}>
      <p className="mb-4 font-mono text-[11px] leading-relaxed text-foreground/70">
        This result is not a prediction. It is fixed arithmetic on the facts below — check it with a calculator.
        Same inputs, same answer, every time.
      </p>

      {!props.governingSection.isFineOnly && (
        <CustodyMeter days={props.daysInCustody} threshold={props.thresholdDays} max={props.governingSection.maxSentenceDays} tone={d.verdictTone} />
      )}

      <AnimatedDerivation
        lines={d.lines}
        comparison={`${d.comparison.left}  ${d.comparison.operator}  ${d.comparison.right}`}
        verdict={d.verdict}
        verdictClass={verdictClass}
      />

      {d.verdictTone === "tier1" && (
        <p className="mt-2 font-mono text-xs text-accent uppercase">
          Tier 1: this person has already been held longer than the longest sentence the court could give them.
        </p>
      )}

      {d.gradedNote && (
        <p className="mt-3 border-l-4 border-foreground/40 pl-3 font-mono text-[11px] leading-relaxed text-foreground/75">
          {d.gradedNote}
        </p>
      )}

      {props.arrestDateIsProxy && (
        <p className="mt-3 border-l-4 border-accent pl-3 font-mono text-[11px] leading-relaxed text-foreground/75">
          Arrest date is an approximation: {props.arrestDateProxyNote ?? "the source did not record one, so the earliest available date was used"}.
        </p>
      )}

      {d.orderingCheck && (
        <div className="mt-4 border-2 border-dashed border-accent p-4">
          <p className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">
            Why the order of the steps matters (v4 Flaw #20)
          </p>
          <OrderingBars correct={d.orderingCheck.correctOverdueDays} wrong={d.orderingCheck.wrongOverdueDays} />
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-foreground/75">
            A first-time offender is entitled to be measured against one-third. If the one-half limb were tested
            before the fraction was chosen, the threshold would be {formatDays(d.orderingCheck.wrongThresholdDays)} days
            and this person would look {formatDays(d.orderingCheck.understatedBy)} days less overdue — ranked below
            people who have waited less.
          </p>
        </div>
      )}

      <dl className="mt-4 grid gap-x-4 gap-y-1 font-mono text-[11px] text-foreground/60 sm:grid-cols-2">
        <div>
          <dt className="inline uppercase">Maximum from: </dt>
          <dd className="inline">
            <Link href={`/knowledge-base#${props.governingSection.id}`} className="underline hover:text-accent">
              {props.governingSection.citation ?? `${props.governingSection.law} ${props.governingSection.code}`}
            </Link>{" "}
            · {props.governingSection.version}
          </dd>
        </div>
        <div>
          <dt className="inline uppercase">Prior conviction from: </dt>
          <dd className="inline">{props.priorConvictionsSource ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline uppercase">Computed: </dt>
          <dd className="inline">
            {formatDateDMY(props.computedAt)}{" "}
            {props.custodyAsOf ? `(custody counted to the ${formatDateDMY(props.custodyAsOf)} snapshot)` : "(custody counted to that day)"}
          </dd>
        </div>
        <div>
          <dt className="inline uppercase">Rounding: </dt>
          <dd className="inline">threshold rounded up to a whole day</dd>
        </div>
      </dl>
      <p className="mt-2 font-mono text-[10px] text-foreground/50 uppercase">
        Custody is treated as one continuous stretch from arrest — a stated simplification (v4 Flaw #16).
      </p>
    </ActorPanel>
  );
}
