"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion/Motion";

export interface DerivationView {
  lines: { label: string; value: string; note?: string }[];
  comparison: string;
  verdict: string;
  verdictClass: string;
}

const LINE_GAP = 0.18;

/** Builds the arithmetic one line at a time, then stamps the verdict — the same order a person would check it. */
export function AnimatedDerivation({ lines, comparison, verdict, verdictClass }: DerivationView) {
  const labelWidth = Math.max(...lines.map((l) => l.label.length)) + 2;
  const compareDelay = 0.2 + lines.length * LINE_GAP;

  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      <div className="overflow-x-auto border-2 border-foreground bg-background">
        <pre className="min-w-max p-4 font-mono text-[13px] leading-7 sm:text-sm">
          {lines.map((l, i) => (
            <motion.div
              key={l.label}
              variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { delay: 0.2 + i * LINE_GAP, duration: 0.35, ease: EASE } } }}
            >
              <span className="text-foreground/55">{`${l.label}:`.padEnd(labelWidth)}</span>
              <span className="font-bold">{l.value}</span>
              {l.note && <span className="text-foreground/55">{`   (${l.note})`}</span>}
            </motion.div>
          ))}
          <motion.div
            className="my-2 h-px origin-left border-t border-dashed border-foreground/40"
            variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { delay: compareDelay - 0.1, duration: 0.4 } } }}
          />
          <motion.div
            className="text-base font-bold sm:text-lg"
            variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { delay: compareDelay, duration: 0.3 } } }}
            style={{ transformOrigin: "left" }}
          >
            {comparison}
          </motion.div>
        </pre>
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 1.08, y: 8 },
          show: { opacity: 1, scale: 1, y: 0, transition: { delay: compareDelay + 0.35, type: "spring", stiffness: 260, damping: 18 } },
        }}
        className={`mt-3 border-2 px-4 py-3 font-display text-lg leading-tight uppercase sm:text-xl ${verdictClass}`}
      >
        → {verdict}
      </motion.div>
    </motion.div>
  );
}

/** Days in custody against the release threshold and the maximum sentence, drawn to scale. */
export function CustodyMeter({ days, threshold, max, tone }: { days: number; threshold: number; max: number; tone: "tier1" | "tier2" | "not_yet" }) {
  const scale = Math.max(days, max, 1) * 1.08;
  const pct = (d: number) => `${(d / scale) * 100}%`;
  const fill = tone === "tier1" ? "bg-accent" : tone === "tier2" ? "bg-foreground" : "bg-foreground/40";
  return (
    <div className="mt-4 mb-6">
      <p className="mb-2 font-mono text-[10px] tracking-widest text-foreground/60 uppercase">Drawn to scale</p>
      <div className="relative h-6 border-2 border-foreground bg-background">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          whileInView={{ width: pct(days) }}
          viewport={{ once: true }}
          transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
        />
        {[
          { at: threshold, label: `threshold ${threshold.toLocaleString("en-IN")}`, accent: true },
          { at: max, label: `max ${max.toLocaleString("en-IN")}` },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            className="absolute -top-2 -bottom-2"
            style={{ left: pct(m.at) }}
            initial={{ opacity: 0, y: -6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 + i * 0.2 }}
          >
            <div className={`h-full w-1 -translate-x-1/2 ${m.accent ? "bg-accent" : "bg-foreground"}`} />
            <span
              className={`absolute top-full mt-1 font-mono text-[9px] whitespace-nowrap uppercase ${i === 0 ? "-translate-x-1/2" : "-translate-x-full"} ${m.accent ? "text-accent" : "text-foreground/60"}`}
            >
              {m.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function OrderingBars({ correct, wrong }: { correct: number; wrong: number }) {
  const rows = [
    { label: "Correct: fraction chosen first (1/3)", value: correct, className: "bg-accent", strike: false },
    { label: "Wrong: 1/2 limb tested first", value: wrong, className: "bg-foreground/30", strike: true },
  ];
  return (
    <div className="mt-3 flex flex-col gap-3 font-mono">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[10px] text-foreground/60 uppercase">{r.label}</span>
            <span className={`text-xl font-bold sm:text-2xl ${r.strike ? "text-foreground/55 line-through decoration-accent" : "text-accent"}`}>
              {r.value.toLocaleString("en-IN")} days overdue
            </span>
          </div>
          <div className="h-3 border-2 border-foreground/40">
            <motion.div
              className={`h-full ${r.className}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${(r.value / Math.max(correct, 1)) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.4 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
