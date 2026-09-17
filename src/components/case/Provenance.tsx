import type { ReactNode } from "react";

export type DataSourceValue = "SYNTHETIC_CHARGE_SHEET" | "ECOURTS_METADATA" | "MANUAL_ENTRY";
export type CustodySourceValue = "SIMULATED" | "EPRISONS";

const DATA_SOURCE: Record<DataSourceValue, { label: string; short: string; className: string; title: string }> = {
  ECOURTS_METADATA: {
    label: "Real court metadata",
    short: "eCourts",
    className: "border-lawyer text-lawyer",
    title: "Case facts loaded from public eCourts / Development Data Lab court metadata",
  },
  SYNTHETIC_CHARGE_SHEET: {
    label: "Synthetic charge sheet",
    short: "Synthetic",
    className: "border-foreground/50 text-foreground/70 border-dashed",
    title: "Fictional person and FIR — real charge sheets are not public documents",
  },
  MANUAL_ENTRY: {
    label: "Manual entry",
    short: "Manual",
    className: "border-foreground/50 text-foreground/70",
    title: "Entered by a lawyer through the New case form",
  },
};

export function DataSourceBadge({ source, compact = false }: { source: DataSourceValue; compact?: boolean }) {
  const s = DATA_SOURCE[source];
  return (
    <span title={s.title} className={`inline-block border px-1.5 py-0.5 font-mono text-[9px] tracking-widest whitespace-nowrap uppercase ${s.className}`}>
      {compact ? s.short : s.label}
    </span>
  );
}

export function CustodySourceBadge({ source, compact = false }: { source: CustodySourceValue; compact?: boolean }) {
  return source === "EPRISONS" ? (
    <span className="inline-block border border-lawyer px-1.5 py-0.5 font-mono text-[9px] tracking-widest whitespace-nowrap text-lawyer uppercase">
      {compact ? "e-Prisons" : "Custody: e-Prisons"}
    </span>
  ) : (
    <span
      title="Custody status is simulated until e-Prisons institutional access is granted"
      className="inline-block border border-dashed border-foreground/50 px-1.5 py-0.5 font-mono text-[9px] tracking-widest whitespace-nowrap text-foreground/70 uppercase"
    >
      {compact ? "Custody sim." : "Custody: simulated"}
    </span>
  );
}

export function ArrestProxyBadge() {
  return (
    <span
      title="Arrest date absent from the source — earliest available date used, and labelled as such"
      className="inline-block border border-accent px-1.5 py-0.5 font-mono text-[9px] tracking-widest whitespace-nowrap text-accent uppercase"
    >
      Approx. arrest date
    </span>
  );
}

export type Actor = "AI" | "RULES" | "LAWYER" | "ECOURTS" | "SYSTEM";

const ACTOR: Record<Actor, { label: string; className: string }> = {
  AI: { label: "AI read", className: "border-ai text-ai border-dashed" },
  RULES: { label: "Fixed rule", className: "border-rules text-rules" },
  LAWYER: { label: "Lawyer", className: "border-lawyer text-lawyer" },
  ECOURTS: { label: "eCourts", className: "border-foreground/60 text-foreground/80" },
  SYSTEM: { label: "System", className: "border-foreground/60 text-foreground/80" },
};

export function ActorTag({ actor, children }: { actor: Actor; children?: ReactNode }) {
  const a = ACTOR[actor];
  return (
    <span className={`inline-flex items-center gap-1 border-2 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest whitespace-nowrap uppercase ${a.className}`}>
      {children ?? a.label}
    </span>
  );
}

/** A panel whose left edge says who produced its content. */
export function ActorPanel({
  actor,
  title,
  tag,
  children,
  className = "",
}: {
  actor: "AI" | "RULES" | "LAWYER";
  title: ReactNode;
  tag?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const edge = actor === "AI" ? "border-l-ai border-l-[6px] border-dashed" : actor === "LAWYER" ? "border-l-lawyer border-l-[6px]" : "border-l-rules border-l-[6px]";
  return (
    <section className={`border-2 border-foreground bg-panel ${edge} ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground/15 px-4 py-3">
        <h2 className="font-display text-base tracking-tight uppercase sm:text-lg">{title}</h2>
        <span className="ml-auto">{tag ?? <ActorTag actor={actor} />}</span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
