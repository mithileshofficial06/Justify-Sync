"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber, EASE, PulseDot } from "@/components/motion/Motion";

export function DashboardHero({
  userName,
  districtName,
  date,
  scanned,
  tier1,
  tier2,
  trackB,
  notYet,
  review,
  provenance,
}: {
  userName: string | null;
  districtName: string;
  date: string;
  scanned: number;
  tier1: number;
  tier2: number;
  trackB: number;
  notYet: number;
  review: number;
  provenance: ReactNode;
}) {
  const eligible = tier1 + tier2;
  const segments = [
    { label: "Tier 1", value: tier1, className: "bg-accent" },
    { label: "Tier 2", value: tier2, className: "bg-foreground" },
    { label: "Track B", value: trackB, className: "bg-ai" },
    { label: "Needs review", value: review, className: "bg-foreground/40" },
    { label: "Not yet", value: notYet, className: "bg-foreground/15" },
  ];
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));

  return (
    <div className="relative mb-10 overflow-hidden border-2 border-foreground bg-panel">
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative p-5 sm:p-7">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-widest text-foreground/60 uppercase"
        >
          <PulseDot />
          Daily ranked worklist · {districtName} · {date}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          className="mt-3 font-display text-3xl leading-[0.95] tracking-tight uppercase sm:text-5xl"
        >
          {userName ? <span className="mb-2 block font-mono text-sm tracking-normal text-foreground/55 normal-case sm:text-base">Welcome back, {userName}.</span> : null}
          <span className="text-accent">
            <AnimatedNumber value={eligible} />
          </span>{" "}
          {eligible === 1 ? "person is" : "people are"} past their release threshold.
        </motion.h1>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Undertrials scanned" value={scanned} delay={0.1} />
          <Stat label="Tier 1 · beyond max" value={tier1} accent delay={0.15} />
          <Stat label="Tier 2 · threshold met" value={tier2} delay={0.2} />
          <Stat label="Track B · bail, inside" value={trackB} delay={0.25} />
        </div>

        <div className="mt-6">
          <div className="flex h-3 w-full overflow-hidden border-2 border-foreground bg-background">
            {segments.map((s, i) => (
              <motion.div
                key={s.label}
                className={`h-full ${s.className}`}
                initial={{ width: 0 }}
                animate={{ width: `${(s.value / total) * 100}%` }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.08 }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-wide text-foreground/65 uppercase">
            {segments.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 ${s.className}`} />
                {s.label} {s.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative border-t-2 border-foreground bg-background px-4 py-2 font-mono text-[10px] leading-relaxed tracking-wide text-foreground/70 uppercase sm:px-7">
        {provenance}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, delay }: { label: string; value: number; accent?: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      whileHover={{ y: -3 }}
      className={`border-2 bg-background px-3 py-2 ${accent ? "border-accent" : "border-foreground"}`}
    >
      <p className="font-mono text-[9px] tracking-widest text-foreground/55 uppercase">{label}</p>
      <p className={`font-display text-2xl sm:text-3xl ${accent ? "text-accent" : ""}`}>
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

export function SectionTitle({ title, sub, count, heavy }: { title: string; sub: string; count: number; heavy?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }}>
      <div className={`mb-2 flex items-baseline gap-3 pb-2 ${heavy ? "border-b-4 border-accent" : "border-b-2 border-foreground"}`}>
        {heavy && (
          <span className="self-center">
            <PulseDot />
          </span>
        )}
        <h2 className={`font-display tracking-tight uppercase ${heavy ? "text-xl text-accent sm:text-2xl" : "text-lg sm:text-xl"}`}>{title}</h2>
        <span className={`ml-auto font-mono text-xs ${heavy ? "border-2 border-accent bg-accent px-1.5 text-white" : "border-2 border-foreground px-1.5"}`}>{count}</span>
      </div>
      <p className="mb-3 max-w-2xl font-mono text-[11px] text-foreground/60">{sub}</p>
    </motion.div>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return (
    <motion.ol
      className="flex flex-col gap-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-20px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.ol>
  );
}

export function WorklistRow({
  href,
  rank,
  heavy,
  name,
  meta,
  badges,
  overdueDays,
  daysInCustody,
  thresholdDays,
  maxSentenceDays,
  isFineOnly,
}: {
  href: string;
  rank: number;
  heavy?: boolean;
  name: string;
  meta: string;
  badges: ReactNode;
  overdueDays: number;
  daysInCustody: number;
  thresholdDays: number;
  maxSentenceDays: number;
  isFineOnly: boolean;
}) {
  const scale = Math.max(daysInCustody, maxSentenceDays, 1) * 1.05;
  const pct = (d: number) => `${(d / scale) * 100}%`;
  return (
    <motion.li variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
      <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
        <Link
          href={href}
          className={`group block bg-panel p-3 transition-shadow hover:shadow-[6px_6px_0_0_var(--accent)] ${heavy ? "border-2 border-accent" : "border-2 border-foreground"}`}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2">
            <span className={`flex h-8 w-8 items-center justify-center border-2 font-mono text-xs ${heavy ? "border-accent text-accent" : "border-foreground/40 text-foreground/60"}`}>
              {rank}
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm break-words uppercase group-hover:text-accent">{name}</p>
              <p className="font-mono text-[11px] text-foreground/65">{meta}</p>
            </div>
            <div className="text-right">
              <p className={`font-display text-2xl leading-none tabular-nums sm:text-3xl ${heavy ? "text-accent" : ""}`}>
                <AnimatedNumber value={overdueDays} duration={0.9} />
              </p>
              <p className="font-mono text-[9px] tracking-widest text-foreground/60 uppercase">days overdue</p>
            </div>
          </div>

          {!isFineOnly && (
            <div className="mt-3 ml-11">
              <div className="relative h-2 bg-foreground/10">
                <motion.div
                  className={`h-full ${heavy ? "bg-accent" : "bg-foreground"}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: pct(daysInCustody) }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: EASE, delay: 0.15 }}
                />
                <span className="absolute -top-1 -bottom-1 w-0.5 bg-accent" style={{ left: pct(thresholdDays) }} title="Release threshold" />
                <span className="absolute -top-1 -bottom-1 w-0.5 bg-foreground/60" style={{ left: pct(maxSentenceDays) }} title="Maximum sentence" />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[9px] text-foreground/50 uppercase">
                <span>{daysInCustody.toLocaleString("en-IN")} days inside</span>
                <span>
                  <span className="text-accent">threshold {thresholdDays.toLocaleString("en-IN")}</span> · max {maxSentenceDays.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
          <div className="mt-2 ml-11 flex flex-wrap gap-1">{badges}</div>
        </Link>
      </motion.div>
    </motion.li>
  );
}

export function TrackBRow({ href, name, meta, badges, daysSinceBail }: { href: string; name: string; meta: string; badges: ReactNode; daysSinceBail: number | null }) {
  const days = daysSinceBail ?? 0;
  return (
    <motion.li variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
      <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
        <Link href={href} className="group block border-2 border-foreground bg-panel p-3 transition-shadow hover:shadow-[6px_6px_0_0_var(--ai)]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
            <div className="min-w-0">
              <p className="font-display text-sm break-words uppercase group-hover:text-accent">{name}</p>
              <p className="font-mono text-[11px] text-foreground/60">{meta}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl leading-none text-accent">{daysSinceBail ?? "?"}</p>
              <p className="font-mono text-[9px] tracking-widest text-foreground/60 uppercase">days since bail</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: Math.min(days, 30) }, (_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.03, type: "spring", stiffness: 500, damping: 20 }}
                className={`h-2.5 w-2.5 ${i >= 7 ? "bg-accent" : "bg-foreground/60"}`}
              />
            ))}
            {days > 30 && <span className="font-mono text-[9px] text-foreground/50">+{days - 30}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">{badges}</div>
        </Link>
      </motion.div>
    </motion.li>
  );
}
