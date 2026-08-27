"use client";

import { motion, MotionConfig, type Variants } from "framer-motion";
import { Label, Panel, SectionLabel, LinkButton, Badge } from "@/components/ui";
import { CountUp } from "@/components/CountUp";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const viewport = { once: true, margin: "-80px" };

export function Showcase() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1">
        {/* HERO */}
        <section className="border-b-2 border-foreground px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="mb-6 flex flex-wrap items-center gap-3"
            >
              <motion.span variants={fadeUp}>
                <Badge tone="accent">Section 479 BNSS</Badge>
              </motion.span>
              <motion.span variants={fadeUp}>
                <Label>Undertrial release triage system</Label>
              </motion.span>
              <motion.span
                variants={fadeUp}
                className="ml-auto flex items-center gap-2 font-mono text-[10px] tracking-widest text-foreground/50 uppercase"
              >
                <motion.span
                  className="h-2 w-2 rounded-full bg-accent"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
                Running daily
              </motion.span>
            </motion.div>

            <h1 className="font-display leading-[0.85] tracking-tight uppercase">
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
                className="block text-[15vw] sm:text-[9rem] md:text-[10rem]"
              >
                Justify
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0, scale: [1, 1.015, 1] }}
                transition={{
                  opacity: { duration: 0.7, ease: EASE, delay: 0.2 },
                  y: { duration: 0.7, ease: EASE, delay: 0.2 },
                  scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 },
                }}
                className="block text-[15vw] text-accent sm:text-[9rem] md:text-[10rem]"
              >
                Sync
              </motion.span>
            </h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
              style={{ transformOrigin: "left" }}
              className="mt-2 h-1 w-40 bg-accent"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 max-w-xl font-mono text-sm text-foreground/70"
            >
              People who have already legally earned their freedom stay in jail because nobody checks the
              paperwork often enough. This checks every day, ranks who&apos;s most overdue, and hands the
              lawyer whose job it already is a sorted list instead of an unsorted backlog.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <LinkButton href="/register">Register as DLSA lawyer →</LinkButton>
              <LinkButton href="/login">Log in</LinkButton>
            </motion.div>
          </div>
        </section>

        {/* THE PROBLEM */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="border-b-2 border-foreground px-4 py-16"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div variants={fadeUp}>
              <SectionLabel n="01">The problem</SectionLabel>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="mb-8 max-w-2xl font-display text-2xl leading-tight uppercase sm:text-3xl"
            >
              Nobody checks the paperwork often enough — and when someone does, less than half of the
              people recommended for release actually walk out.
            </motion.p>

            <motion.div variants={stagger} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: <CountUp target={73} suffix="%" />, label: "of prisoners are undertrials", accent: true },
                { value: <CountUp target={112.7} decimals={1} suffix="%" />, label: "prison occupancy rate" },
                { value: <CountUp target={528728} />, label: "total prisoners, Q1 2024" },
                { value: <>~<CountUp target={5} suffix="%" /></>, label: "reviewed that quarter" },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -3 }} className="border-2 border-foreground p-4">
                  <div className={`font-display text-3xl uppercase sm:text-4xl ${s.accent ? "text-accent" : ""}`}>
                    {s.value}
                  </div>
                  <div className="mt-1 font-mono text-[11px] tracking-widest text-foreground/60 uppercase">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 border-2 border-foreground p-5">
              <Label>The funnel, one real quarter (Jan–Mar 2024)</Label>
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-sm sm:text-base">
                <span className="border-2 border-foreground px-3 py-1.5">24,100 reviewed</span>
                <FunnelArrow delay={0} />
                <span className="border-2 border-foreground px-3 py-1.5">15,777 recommended</span>
                <FunnelArrow delay={0.25} />
                <span className="border-2 border-foreground px-3 py-1.5">12,395 filed</span>
                <FunnelArrow delay={0.5} />
                <span className="border-2 border-accent bg-accent px-3 py-1.5 text-white">7,421 released</span>
              </div>
              <p className="mt-4 font-mono text-xs text-foreground/60 uppercase">
                Every drop is a separate failure. ~3,400 recommendations never became filings. ~1,750 people
                granted bail never left prison — overwhelmingly for want of surety.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* THE SOLUTION */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="border-b-2 border-foreground bg-foreground px-4 py-16 text-background"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div variants={fadeUp}>
              <SectionLabel n="02">The one rule that fixes almost everything</SectionLabel>
            </motion.div>
            <p className="font-display text-3xl leading-tight uppercase sm:text-4xl md:text-5xl">
              <motion.span variants={fadeUp} className="block">
                AI reads and writes.
              </motion.span>
              <motion.span variants={fadeUp} className="block">
                Fixed rules decide and rank.
              </motion.span>
              <motion.span variants={fadeUp} className="block text-accent">
                A human always signs off.
              </motion.span>
            </p>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl font-mono text-sm text-background/70">
              Same inputs, same answer, every time — a judge or lawyer can check the arithmetic by hand in
              under a minute. Nobody has to trust the AI. They just have to check the maths.
            </motion.p>
          </div>
        </motion.section>

        {/* HOW IT WORKS */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="border-b-2 border-foreground px-4 py-16"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div variants={fadeUp}>
              <SectionLabel n="03">How it runs, every day</SectionLabel>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-3"
            >
              {[
                { n: "01", t: "Read", d: "AI extracts arrest date, section charged, prior convictions — every fact grounded to its exact source sentence." },
                { n: "02", t: "Decide", d: "Fixed, deterministic arithmetic — never AI — computes the statutory threshold and tier for each case." },
                { n: "03", t: "Rank", d: "Tier 1 (full term served) above Tier 2 (threshold met), most overdue first within each tier." },
                { n: "04", t: "Draft", d: "AI writes a ready-to-file release or surety-modification application from the facts already computed." },
                { n: "05", t: "Review", d: "The DLSA lawyer already assigned to that district reviews — extra time only on flagged cases." },
                { n: "06", t: "Track", d: "Every case followed to filed → heard → bail granted → released. Anything stalled gets flagged." },
              ].map((s) => (
                <motion.div key={s.n} variants={fadeUp} className="bg-background p-5 transition-colors hover:bg-panel">
                  <div className="mb-3 font-mono text-xs text-accent">{s.n}</div>
                  <div className="mb-2 font-display text-lg uppercase">{s.t}</div>
                  <p className="font-mono text-xs text-foreground/60">{s.d}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* THE TIERS */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="border-b-2 border-foreground px-4 py-16"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div variants={fadeUp}>
              <SectionLabel n="04">Two tracks, one daily pass</SectionLabel>
            </motion.div>

            <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-3">
              {[
                { badge: "Tier 1", accent: true, t: "Full term served", d: "Days in custody ≥ the maximum possible sentence for the governing section. Ranks above every other case — detained beyond any sentence they could have received." },
                { badge: "Tier 2", accent: false, t: "Threshold met", d: "1/3 of max sentence if never previously convicted, 1/2 otherwise — selected before tier testing, so a first-timer is never measured against the wrong fraction." },
                { badge: "Track B", accent: false, t: "Bail granted, not released", d: "Bail order exists, still in custody, 7+ days on — almost always a surety problem. No sentencing law needed, just two facts." },
              ].map((c) => (
                <motion.div key={c.t} variants={fadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.15 }}>
                  <Panel className="h-full p-5 transition-colors hover:border-accent">
                    <Badge tone={c.accent ? "accent" : "default"}>{c.badge}</Badge>
                    <p className="mt-3 font-display text-lg uppercase">{c.t}</p>
                    <p className="mt-2 font-mono text-xs text-foreground/60">{c.d}</p>
                  </Panel>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* TRUST */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="border-b-2 border-foreground px-4 py-16"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div variants={fadeUp}>
              <SectionLabel n="05">Why you can check it, not just trust it</SectionLabel>
            </motion.div>

            <motion.div variants={stagger} className="grid gap-3 sm:grid-cols-2">
              {[
                ["Grounded facts", "Every AI-extracted fact points to the exact source sentence it came from. Untraceable facts are discarded, not guessed."],
                ["Self-checked", "Extraction runs twice; disagreement routes to human review rather than silently picking one answer."],
                ["Fail-safe defaults", "Blank or unclear fields are never assumed favorable — a missing prior-conviction status routes to review, never to \"no priors.\""],
                ["Nothing silently excluded", "Special-act cases (NDPS, UAPA, PMLA...) get stricter scrutiny, never a blanket auto-exclusion that would drop the longest-detained."],
                ["Full audit trail", "Every login, view, and decision is logged against the authenticated Bar Council identity that made it."],
                ["Bar Council verified login", "Access is gated behind a real, checkable professional credential — not just an email address."],
              ].map(([t, d]) => (
                <motion.div key={t} variants={fadeUp} whileHover={{ y: -2 }} className="border-2 border-foreground p-4">
                  <p className="font-display text-sm uppercase">{t}</p>
                  <p className="mt-2 font-mono text-xs text-foreground/60">{d}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* FOOTER CTA */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          variants={stagger}
          className="px-4 py-20"
        >
          <div className="mx-auto max-w-5xl text-center">
            <motion.p variants={fadeUp} className="font-display text-3xl uppercase sm:text-4xl">
              Not a new job. <span className="text-accent">The one you already have.</span>
            </motion.p>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-lg font-mono text-sm text-foreground/60">
              Built for the District Legal Services Authority lawyer already assigned to a district — a
              sorted list and a draft for each case, instead of a manual, unranked backlog.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton href="/register">Register as DLSA lawyer →</LinkButton>
              <LinkButton href="/login">Log in</LinkButton>
            </motion.div>
          </div>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

function FunnelArrow({ delay }: { delay: number }) {
  return (
    <motion.span
      className="text-accent"
      animate={{ x: [0, 5, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4, delay, ease: "easeInOut" }}
    >
      →
    </motion.span>
  );
}
