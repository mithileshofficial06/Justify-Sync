import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getNeedsReviewCases } from "@/lib/queries/needsReview";
import { formatDays } from "@/lib/engine/explain";
import { DataSourceBadge } from "@/components/case/Provenance";
import { Label, H1 } from "@/components/ui";

type Row = Awaited<ReturnType<typeof getNeedsReviewCases>>[number];

const GROUPS: { codes: string[]; title: string; why: string; outcome: "ranked" | "held" | "routed" }[] = [
  {
    codes: ["SPECIAL_ACT"],
    title: "Special act — stricter scrutiny, still ranked",
    why: "NDPS, UAPA, PMLA, POCSO and similar cases are not auto-excluded: courts have applied §479 to special-act undertrials too. They stay on the ranked list, and a lawyer must review them before anything is filed.",
    outcome: "ranked",
  },
  {
    codes: ["PRIORS_UNKNOWN"],
    title: "Prior-conviction status unclear",
    why: "The document does not clearly say whether the accused was previously convicted. That decides 1/3 versus 1/2, so it is never assumed to be \"no priors\" — a lawyer confirms it.",
    outcome: "held",
  },
  {
    codes: ["PENDING_UNKNOWN"],
    title: "Possible other pending case",
    why: "Another record may be the same person under a different spelling. More than one pending case changes eligibility under §479(2), so a lawyer confirms the match — the system never decides it.",
    outcome: "held",
  },
  {
    codes: ["GRADED_BAND_UNRESOLVED"],
    title: "Graded section — part not established",
    why: "Punishment depends on facts the record does not settle (e.g. §304 Part I or Part II). One part carries life, so the part decides whether §479 applies at all.",
    outcome: "held",
  },
  {
    codes: ["JUVENILE"],
    title: "Juvenile — routed to the Juvenile Justice Act",
    why: "The accused was under 18 at the time of the offence. Their case belongs before the Juvenile Justice Board, not under BNSS §479 — recorded here so it is visibly routed, not lost.",
    outcome: "routed",
  },
  {
    codes: ["DEATH_OR_LIFE", "CONFIRMED_MULTI"],
    title: "Excluded by §479 itself",
    why: "The offence carries death or life imprisonment, or more than one case is confirmed pending — both statutory carve-outs. Listed so the exclusion is auditable.",
    outcome: "routed",
  },
];

const OUTCOME_LABEL = { ranked: "Ranked + review", held: "Held for lawyer", routed: "Routed out" } as const;

export default async function NeedsReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cases = await getNeedsReviewCases(session);
  const known = new Set(GROUPS.flatMap((g) => g.codes));
  const uncategorised = cases.filter((c) => !c.exclusionCode || !known.has(c.exclusionCode));
  const showDistrict = session.role === "STATE_ADMIN";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
      <Label>Nobody is silently dropped</Label>
      <div className="mt-1 mb-3">
        <H1>Needs review</H1>
      </div>
      <p className="mb-8 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/65">
        When the rules cannot safely decide, the case comes here with the reason — it is never quietly excluded and
        never quietly assumed eligible. Resolve it on the case page with a better document or a lawyer&apos;s override,
        and it is recomputed.
      </p>

      {GROUPS.map((g) => {
        const rows = cases.filter((c) => c.exclusionCode && g.codes.includes(c.exclusionCode));
        return (
          <section key={g.title} className="mb-8">
            <div className="mb-2 flex flex-wrap items-baseline gap-3 border-b-2 border-foreground pb-2">
              <h2 className="font-display text-base tracking-tight uppercase sm:text-lg">{g.title}</h2>
              <span className="ml-auto border-2 border-foreground px-1.5 font-mono text-xs">{rows.length}</span>
            </div>
            <p className="mb-3 font-mono text-[11px] leading-relaxed text-foreground/65">{g.why}</p>
            {rows.length === 0 ? (
              <p className="font-mono text-xs text-foreground/40 uppercase">None right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((c) => (
                  <ReviewRow key={c.caseId} c={c} outcome={g.outcome} showDistrict={showDistrict} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {uncategorised.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 border-b-2 border-foreground pb-2 font-display text-lg uppercase">Not yet recomputed ({uncategorised.length})</h2>
          <ul className="flex flex-col gap-2">
            {uncategorised.map((c) => (
              <ReviewRow key={c.caseId} c={c} outcome="held" showDistrict={showDistrict} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function ReviewRow({ c, outcome, showDistrict }: { c: Row; outcome: keyof typeof OUTCOME_LABEL; showDistrict: boolean }) {
  return (
    <li>
      <Link href={`/cases/${c.caseId}`} className="group block border-2 border-foreground bg-panel p-3 transition-colors hover:border-accent">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm uppercase group-hover:text-accent">{c.personName}</p>
          <span
            className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase ${
              outcome === "ranked" ? "border-accent text-accent" : outcome === "held" ? "border-foreground" : "border-foreground/40 text-foreground/60"
            }`}
          >
            {OUTCOME_LABEL[outcome]}
          </span>
          <span className="ml-auto">
            <DataSourceBadge source={c.dataSource} compact />
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-foreground/60">
          {showDistrict && `${c.districtName} · `}
          {c.charged || "no sections resolved"}
          {c.tier && c.overdueDays !== null && ` · ${c.tier === "TIER_1" ? "Tier 1" : "Tier 2"}, ${formatDays(c.overdueDays)} days overdue`}
        </p>
        {c.exclusionReason && <p className="mt-1 font-mono text-[11px] leading-relaxed text-foreground/80">{c.exclusionReason}</p>}
      </Link>
    </li>
  );
}
