"use client";

import { motion } from "framer-motion";
import { AnimatedNumber, EASE, Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { SectionHeader } from "./SectionHeader";

const STATS = [
  { value: 73, suffix: "%", label: "of India's prisoners are undertrials — not convicted of anything", accent: true },
  { value: 112.7, decimals: 1, suffix: "%", label: "prison occupancy — more people than places" },
  { value: 528728, label: "people in prison, Jan–Mar 2024" },
  { value: 5, prefix: "~", suffix: "%", label: "of them reviewed for release that quarter" },
];

const FUNNEL = [
  { label: "People in prison", value: 528728, width: 100 },
  { label: "Cases reviewed", value: 24100, width: 78 },
  { label: "Recommended for release", value: 15777, width: 62 },
  { label: "Applications filed", value: 12395, width: 50, leakBefore: "~3,400 recommendations never filed" },
  { label: "Actually released", value: 7421, width: 36, accent: true, leakBefore: "~1,750 granted bail, never released" },
];

export function ProblemSection() {
  return (
    <section id="problem" className="relative scroll-mt-4 border-b-2 border-foreground px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader n="01" eyebrow="The problem">
          The law already says they should go home. <span className="text-accent">The paperwork never reaches the court.</span>
        </SectionHeader>

        <Stagger className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <StaggerItem key={s.label}>
              <motion.div whileHover={{ y: -4 }} className="h-full border-2 border-foreground bg-panel p-4 sm:p-5">
                <div className={`font-display text-3xl uppercase sm:text-5xl ${s.accent ? "text-accent" : ""}`}>
                  <AnimatedNumber value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <p className="mt-2 font-mono text-[11px] leading-snug text-foreground/65 uppercase">{s.label}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          <Reveal>
            <h3 className="font-display text-2xl leading-tight uppercase sm:text-3xl">One real quarter, followed to the end</h3>
            <p className="mt-4 max-w-md font-mono text-sm leading-relaxed text-foreground/70">
              Each step down the funnel is a separate failure. Finding eligible people is not the hard part — the drop
              happens <span className="text-foreground">after</span> someone is recommended: applications that are never
              filed, and bail orders that never turn into a release because the person cannot arrange surety.
            </p>
            <div className="mt-6 border-l-4 border-accent pl-4">
              <p className="font-display text-lg leading-tight uppercase">Identification is not the bottleneck.</p>
              <p className="font-display text-lg leading-tight text-accent uppercase">Filing and release are.</p>
            </div>
          </Reveal>

          <ol className="flex flex-col gap-2">
            {FUNNEL.map((f, i) => (
              <li key={f.label}>
                {f.leakBefore && (
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.12 }}
                    className="my-1 flex items-center gap-2 font-mono text-[11px] text-accent uppercase"
                  >
                    <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      ↘
                    </motion.span>
                    Leak: {f.leakBefore}
                  </motion.div>
                )}
                <p className={`mb-1 font-mono text-[11px] tracking-wide uppercase ${f.accent ? "text-accent" : "text-foreground/70"}`}>{f.label}</p>
                <div className="flex items-center gap-3">
                  <div className="relative h-7 flex-1 sm:h-9">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${f.width}%` }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
                      className={`h-full border-2 ${f.accent ? "border-accent bg-accent" : "border-foreground bg-foreground"}`}
                    />
                  </div>
                  <span className={`w-24 text-right font-display text-lg tabular-nums sm:text-2xl ${f.accent ? "text-accent" : ""}`}>
                    <AnimatedNumber value={f.value} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Reveal className="mt-16">
          <div className="relative overflow-hidden border-2 border-foreground bg-foreground p-6 text-background sm:p-8">
            <motion.div
              aria-hidden
              className="absolute -right-10 -bottom-16 h-56 w-56 rounded-full bg-accent/40 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <p className="relative font-mono text-[10px] tracking-widest text-background/60 uppercase">Why now</p>
            <p className="relative mt-2 max-w-3xl font-display text-2xl leading-tight uppercase sm:text-3xl">
              NALSA proved systematic review works for convicts in May 2026.{" "}
              <span className="text-accent">It has never been applied to undertrials.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
