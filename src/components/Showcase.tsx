import { Label, Panel, StatBlock, SectionLabel, LinkButton, Badge } from "@/components/ui";

export function Showcase() {
  return (
    <main className="flex-1">
      {/* HERO */}
      <section className="border-b-2 border-foreground px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="rise-in mb-6 flex flex-wrap items-center gap-3" style={{ animationDelay: "0ms" }}>
            <Badge tone="accent">Section 479 BNSS</Badge>
            <Label>Undertrial release triage system</Label>
          </div>

          <h1 className="font-display leading-[0.85] tracking-tight uppercase">
            <span
              className="rise-in block text-[15vw] sm:text-[9rem] md:text-[10rem]"
              style={{ animationDelay: "80ms" }}
            >
              Justify
            </span>
            <span
              className="rise-in block text-[15vw] text-accent sm:text-[9rem] md:text-[10rem]"
              style={{ animationDelay: "220ms" }}
            >
              Sync
            </span>
          </h1>

          <div className="underline-grow mt-2 h-1 w-40 bg-accent" />

          <p className="fade-in mt-8 max-w-xl font-mono text-sm text-foreground/70" style={{ animationDelay: "0.9s" }}>
            People who have already legally earned their freedom stay in jail because nobody checks the
            paperwork often enough. This checks every day, ranks who&apos;s most overdue, and hands the
            lawyer whose job it already is a sorted list instead of an unsorted backlog.
          </p>

          <div className="fade-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "1.1s" }}>
            <LinkButton href="/register">Register as DLSA lawyer →</LinkButton>
            <LinkButton href="/login">Log in</LinkButton>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="border-b-2 border-foreground px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="01">The problem</SectionLabel>
          <p className="mb-8 max-w-2xl font-display text-2xl leading-tight uppercase sm:text-3xl">
            Nobody checks the paperwork often enough — and when someone does, less than half of the
            people recommended for release actually walk out.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBlock value="73%" label="of prisoners are undertrials" accent />
            <StatBlock value="112.7%" label="prison occupancy rate" />
            <StatBlock value="528,728" label="total prisoners, Q1 2024" />
            <StatBlock value="~5%" label="reviewed that quarter" />
          </div>

          <div className="mt-6 border-2 border-foreground p-5">
            <Label>The funnel, one real quarter (Jan–Mar 2024)</Label>
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-sm sm:text-base">
              <span className="border-2 border-foreground px-3 py-1.5">24,100 reviewed</span>
              <span className="text-accent">→</span>
              <span className="border-2 border-foreground px-3 py-1.5">15,777 recommended</span>
              <span className="text-accent">→</span>
              <span className="border-2 border-foreground px-3 py-1.5">12,395 filed</span>
              <span className="text-accent">→</span>
              <span className="border-2 border-accent bg-accent px-3 py-1.5 text-white">7,421 released</span>
            </div>
            <p className="mt-4 font-mono text-xs text-foreground/60 uppercase">
              Every drop is a separate failure. ~3,400 recommendations never became filings. ~1,750 people
              granted bail never left prison — overwhelmingly for want of surety.
            </p>
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section className="border-b-2 border-foreground bg-foreground px-4 py-16 text-background">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="02">The one rule that fixes almost everything</SectionLabel>
          <p className="font-display text-3xl leading-tight uppercase sm:text-4xl md:text-5xl">
            AI reads and writes.
            <br />
            Fixed rules decide and rank.
            <br />
            <span className="text-accent">A human always signs off.</span>
          </p>
          <p className="mt-6 max-w-2xl font-mono text-sm text-background/70">
            Same inputs, same answer, every time — a judge or lawyer can check the arithmetic by hand in
            under a minute. Nobody has to trust the AI. They just have to check the maths.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b-2 border-foreground px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="03">How it runs, every day</SectionLabel>

          <div className="grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-3">
            {[
              { n: "01", t: "Read", d: "AI extracts arrest date, section charged, prior convictions — every fact grounded to its exact source sentence." },
              { n: "02", t: "Decide", d: "Fixed, deterministic arithmetic — never AI — computes the statutory threshold and tier for each case." },
              { n: "03", t: "Rank", d: "Tier 1 (full term served) above Tier 2 (threshold met), most overdue first within each tier." },
              { n: "04", t: "Draft", d: "AI writes a ready-to-file release or surety-modification application from the facts already computed." },
              { n: "05", t: "Review", d: "The DLSA lawyer already assigned to that district reviews — extra time only on flagged cases." },
              { n: "06", t: "Track", d: "Every case followed to filed → heard → bail granted → released. Anything stalled gets flagged." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-5">
                <div className="mb-3 font-mono text-xs text-accent">{s.n}</div>
                <div className="mb-2 font-display text-lg uppercase">{s.t}</div>
                <p className="font-mono text-xs text-foreground/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE TIERS */}
      <section className="border-b-2 border-foreground px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="04">Two tracks, one daily pass</SectionLabel>

          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="p-5">
              <Badge tone="accent">Tier 1</Badge>
              <p className="mt-3 font-display text-lg uppercase">Full term served</p>
              <p className="mt-2 font-mono text-xs text-foreground/60">
                Days in custody ≥ the maximum possible sentence for the governing section. Ranks above
                every other case — detained beyond any sentence they could have received.
              </p>
            </Panel>
            <Panel className="p-5">
              <Badge>Tier 2</Badge>
              <p className="mt-3 font-display text-lg uppercase">Threshold met</p>
              <p className="mt-2 font-mono text-xs text-foreground/60">
                1/3 of max sentence if never previously convicted, 1/2 otherwise — selected before tier
                testing, so a first-timer is never measured against the wrong fraction.
              </p>
            </Panel>
            <Panel className="p-5">
              <Badge>Track B</Badge>
              <p className="mt-3 font-display text-lg uppercase">Bail granted, not released</p>
              <p className="mt-2 font-mono text-xs text-foreground/60">
                Bail order exists, still in custody, 7+ days on — almost always a surety problem. No
                sentencing law needed, just two facts.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b-2 border-foreground px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel n="05">Why you can check it, not just trust it</SectionLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Grounded facts", "Every AI-extracted fact points to the exact source sentence it came from. Untraceable facts are discarded, not guessed."],
              ["Self-checked", "Extraction runs twice; disagreement routes to human review rather than silently picking one answer."],
              ["Fail-safe defaults", "Blank or unclear fields are never assumed favorable — a missing prior-conviction status routes to review, never to \"no priors.\""],
              ["Nothing silently excluded", "Special-act cases (NDPS, UAPA, PMLA...) get stricter scrutiny, never a blanket auto-exclusion that would drop the longest-detained."],
              ["Full audit trail", "Every login, view, and decision is logged against the authenticated Bar Council identity that made it."],
              ["Bar Council verified login", "Access is gated behind a real, checkable professional credential — not just an email address."],
            ].map(([t, d]) => (
              <div key={t} className="border-2 border-foreground p-4">
                <p className="font-display text-sm uppercase">{t}</p>
                <p className="mt-2 font-mono text-xs text-foreground/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-display text-3xl uppercase sm:text-4xl">
            Not a new job. <span className="text-accent">The one you already have.</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg font-mono text-sm text-foreground/60">
            Built for the District Legal Services Authority lawyer already assigned to a district — a
            sorted list and a draft for each case, instead of a manual, unranked backlog.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/register">Register as DLSA lawyer →</LinkButton>
            <LinkButton href="/login">Log in</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
