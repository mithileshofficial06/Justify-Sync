"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { EASE, Reveal } from "@/components/motion/Motion";
import { SectionHeader } from "./SectionHeader";

const MAX = 2555;
const THIRD = 852;
const HALF = 1278;
const END = 2700;

export function TracksSection() {
  return (
    <section id="tracks" className="relative scroll-mt-4 border-b-2 border-foreground px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader n="03" eyebrow="Who gets flagged">
          Two ways someone is stuck. <span className="text-accent">Both caught every day.</span>
        </SectionHeader>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <CustodyMeter />
          <TrackBCard />
        </div>

        <OrderingCatch />
      </div>
    </section>
  );
}

function CustodyMeter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  const days = useMotionValue(reduce ? END : 0);
  const [shown, setShown] = useState(reduce ? END : 0);
  const width = useTransform(days, [0, END], ["0%", "100%"]);
  useMotionValueEvent(days, "change", (v) => setShown(Math.round(v)));

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(days, END, { duration: 5, ease: [0.25, 0.1, 0.25, 1] });
    return () => c.stop();
  }, [inView, reduce, days]);

  const phase = shown >= MAX ? "tier1" : shown >= THIRD ? "tier2" : "waiting";
  const pct = (d: number) => `${(d / END) * 100}%`;

  return (
    <div ref={ref} className="border-2 border-foreground bg-panel p-5 sm:p-6">
      <p className="font-mono text-[10px] tracking-widest text-foreground/60 uppercase">Track A · the §479 threshold</p>
      <h3 className="mt-1 font-display text-2xl leading-tight uppercase">Days in custody vs. the law</h3>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground/70">
        Example: IPC 325, maximum 7 years (2,555 days). A first-time offender must be released after 1/3 of that — 852 days.
      </p>

      <div className="mt-8 mb-10">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-display text-5xl tabular-nums sm:text-6xl">{shown.toLocaleString("en-US")}</span>
          <span className="font-mono text-[10px] tracking-widest text-foreground/60 uppercase">days inside</span>
        </div>
        <div className="relative h-8 border-2 border-foreground bg-background">
          <motion.div
            style={{ width }}
            className={`h-full transition-colors duration-300 ${phase === "tier1" ? "bg-accent" : phase === "tier2" ? "bg-foreground" : "bg-foreground/40"}`}
          />
          {[
            { at: THIRD, label: "1/3 · 852", hit: shown >= THIRD },
            { at: HALF, label: "1/2 · 1,278", hit: shown >= HALF, dim: true },
            { at: MAX, label: "max · 2,555", hit: shown >= MAX },
          ].map((m) => (
            <div key={m.label} className="absolute -top-2 -bottom-2" style={{ left: pct(m.at) }}>
              <motion.div
                className={`h-full w-1 -translate-x-1/2 ${m.hit ? "bg-accent" : "bg-foreground/60"}`}
                animate={m.hit ? { scaleY: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4 }}
              />
              <span className={`absolute top-full mt-1 -translate-x-1/2 font-mono text-[9px] whitespace-nowrap uppercase sm:text-[10px] ${m.hit ? "text-accent" : m.dim ? "text-foreground/40" : "text-foreground/60"}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <PhaseCard active={phase === "waiting"} title="Not yet" text="Below the threshold. Shown with days remaining." />
        <PhaseCard active={phase === "tier2"} title="Tier 2" text="Past 1/3 (or 1/2 with past convictions). Must be released." />
        <PhaseCard active={phase === "tier1"} title="Tier 1" text="Held longer than the maximum sentence itself. Ranked first." accent />
      </div>
    </div>
  );
}

function PhaseCard({ active, title, text, accent }: { active: boolean; title: string; text: string; accent?: boolean }) {
  return (
    <motion.div
      animate={{ scale: active ? 1.03 : 1, opacity: active ? 1 : 0.45 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`border-2 p-3 ${active ? (accent ? "border-accent bg-accent text-white" : "border-foreground bg-foreground text-background") : "border-foreground/30"}`}
    >
      <p className="font-display text-lg uppercase">{title}</p>
      <p className="mt-1 font-mono text-[11px] leading-snug opacity-80">{text}</p>
    </motion.div>
  );
}

function TrackBCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  const [day, setDay] = useState(reduce ? 14 : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, 14, { duration: 3, ease: "linear", onUpdate: (v) => setDay(Math.floor(v)) });
    return () => c.stop();
  }, [inView, reduce]);

  const flagged = day >= 7;
  return (
    <div ref={ref} className="flex flex-col border-2 border-foreground bg-panel p-5 sm:p-6">
      <p className="font-mono text-[10px] tracking-widest text-foreground/60 uppercase">Track B · bail granted, still inside</p>
      <h3 className="mt-1 font-display text-2xl leading-tight uppercase">A court said yes. They never left.</h3>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground/70">
        Usually because they can&apos;t arrange surety. No sentencing law needed — just two facts.
      </p>

      <div className="mt-6 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }, (_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ scale: i === day - 1 ? 1.12 : 1 }}
            transition={{ duration: 0.2 }}
            className={`flex aspect-square items-center justify-center border-2 font-mono text-[10px] transition-colors duration-200 ${
              i < day ? (i >= 7 ? "border-accent bg-accent" : "border-foreground bg-foreground") : "border-foreground/40"
            }`}
          >
            <span className={i < day ? "text-background" : "text-foreground/50"}>{i + 1}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        animate={{ opacity: flagged ? 1 : 0.35, y: flagged ? 0 : 6 }}
        className={`mt-auto border-2 p-3 pt-3 ${flagged ? "border-accent" : "border-foreground/30"}`}
        style={{ marginTop: "1.25rem" }}
      >
        <p className={`font-display text-lg uppercase ${flagged ? "text-accent" : ""}`}>{flagged ? `Day ${day}: flagged` : `Day ${day}`}</p>
        <p className="font-mono text-[11px] text-foreground/70">
          {flagged ? "A surety-modification application is drafted for the lawyer." : "Flag raised 7 days after the bail order."}
        </p>
      </motion.div>
    </div>
  );
}

function OrderingCatch() {
  return (
    <Reveal className="mt-6">
      <div className="grid gap-6 border-2 border-foreground bg-foreground p-5 text-background sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-background/60 uppercase">The detail that matters</p>
          <h3 className="mt-2 font-display text-2xl leading-tight uppercase sm:text-3xl">
            Pick the fraction first. <span className="text-accent">Then test the tiers.</span>
          </h3>
          <p className="mt-3 font-mono text-[12px] leading-relaxed text-background/70">
            A first-time offender is measured against 1/3, not 1/2. Get the order of the steps wrong and the same person looks
            hundreds of days less overdue — and drops down the list below people who have waited less.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <CatchBar label="Correct order (1/3)" value={548} max={548} accent />
          <CatchBar label="Wrong order (1/2 first)" value={122} max={548} strike />
          <p className="font-mono text-[11px] text-background/60 uppercase">Same person · 1,400 days in custody · IPC 420</p>
        </div>
      </div>
    </Reveal>
  );
}

function CatchBar({ label, value, max, accent, strike }: { label: string; value: number; max: number; accent?: boolean; strike?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] uppercase">
        <span className="text-background/70">{label}</span>
        <span className={`font-display text-2xl ${accent ? "text-accent" : "text-background/60"} ${strike ? "line-through decoration-accent" : ""}`}>{value} days overdue</span>
      </div>
      <div className="h-4 border-2 border-background/40">
        <motion.div
          className={`h-full ${accent ? "bg-accent" : "bg-background/40"}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${(value / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: EASE, delay: accent ? 0.1 : 0.5 }}
        />
      </div>
    </div>
  );
}
