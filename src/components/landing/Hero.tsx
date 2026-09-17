"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE, PulseDot } from "@/components/motion/Motion";
import type { PublicDemoAccount } from "@/lib/demo";

const HEADLINE: { words: string[]; accent?: boolean }[] = [
  { words: ["They've", "served"] },
  { words: ["the", "time."] },
  { words: ["Nobody", "checked."], accent: true },
];

export function Hero({ demoAccounts }: { demoAccounts: PublicDemoAccount[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const glyphY = useTransform(scrollYProgress, [0, 1], [0, -160]);

  let wordIndex = 0;

  return (
    <section ref={ref} className="relative overflow-hidden border-b-2 border-foreground">
      <HeroBackground />
      <motion.div
        aria-hidden
        style={{ y: glyphY }}
        className="pointer-events-none absolute -right-10 top-10 font-display text-[40vw] leading-none text-foreground/[0.035] select-none sm:text-[22rem]"
      >
        §479
      </motion.div>

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-10 lg:pb-24">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 border-2 border-foreground bg-panel px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase"
          >
            <PulseDot />
            JuriSync · Section 479 BNSS · checked daily
          </motion.div>

          <h1 className="font-display text-[12.5vw] leading-[0.9] tracking-tight uppercase sm:text-7xl lg:text-[3.9rem] xl:text-[4.3rem]">
            {HEADLINE.map((line, li) => (
              <span key={li} className={`block ${line.accent ? "text-accent" : ""}`}>
                {line.words.map((w) => {
                  const i = wordIndex++;
                  return (
                    <span key={`${li}-${w}`} className="mr-[0.22em] inline-block overflow-hidden pb-[0.06em] align-bottom">
                      <motion.span
                        className="inline-block"
                        initial={{ y: "110%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.07 }}
                      >
                        {w}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
            style={{ transformOrigin: "left" }}
            className="mt-4 h-1.5 w-32 bg-accent"
          />

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.95 }}
            className="mt-6 max-w-xl font-mono text-sm leading-relaxed text-foreground/75 sm:text-base"
          >
            Thousands of undertrials in India have already been held past the point where §479 BNSS says they must be
            released. <span className="text-foreground">JuriSync checks every case, every day</span>, ranks who is most
            overdue, and gives the district&apos;s legal-aid lawyer a sorted list and a ready-to-sign application — with every
            decision shown as arithmetic you can check yourself.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 1.1 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a
              href="#how"
              className="group inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-5 py-3 font-mono text-xs tracking-widest text-background uppercase transition-colors hover:border-accent hover:bg-accent"
            >
              See how it works
              <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                ↓
              </motion.span>
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border-2 border-foreground px-5 py-3 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              Log in
            </Link>
            <Link href="/register" className="inline-flex items-center px-2 py-3 font-mono text-xs tracking-widest uppercase underline hover:text-accent">
              Register as DLSA lawyer →
            </Link>
          </motion.div>

          {demoAccounts.length > 0 && <DemoQuickSignIn accounts={demoAccounts} />}
        </div>

        <LiveCaseCard />
      </motion.div>

      <motion.a
        href="#problem"
        aria-label="Scroll to the problem"
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 font-mono text-[10px] tracking-widest text-foreground/50 uppercase lg:flex"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        Scroll
        <span className="h-6 w-px bg-foreground/40" />
      </motion.a>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
        }}
      />
      <motion.div
        className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, 80, 0], y: [0, 50, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-ai/15 blur-3xl"
        animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function DemoQuickSignIn({ accounts }: { accounts: PublicDemoAccount[] }) {
  return (
    <motion.div
      id="demo"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 1.25 }}
      className="mt-8 border-2 border-accent bg-panel shadow-[6px_6px_0_0_var(--accent)]"
    >
      <div className="flex flex-wrap items-center gap-2 bg-accent px-3 py-2 text-white">
        <span className="font-display text-xs tracking-tight uppercase">Judges &amp; evaluators — sign in here</span>
        <span className="ml-auto font-mono text-[9px] tracking-widest uppercase opacity-90">OTP auto-filled · synthetic data</span>
      </div>
      <ul className="divide-y-2 divide-foreground/10">
        {accounts.map((a) => (
          <li key={a.barEnrolmentNo}>
            <Link
              href={`/login?as=${encodeURIComponent(a.barEnrolmentNo)}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 transition-colors hover:bg-accent/10"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm uppercase">{a.roleLabel}</span>
                <span className="block font-mono text-[11px] text-foreground/70">
                  <span className="text-foreground/45">user </span>
                  <span className="font-bold text-foreground select-all">{a.barEnrolmentNo}</span>
                  <span className="text-foreground/45"> · pass </span>
                  <span className="font-bold text-foreground select-all">{a.password}</span>
                </span>
              </span>
              <span className="font-mono text-[10px] tracking-widest whitespace-nowrap uppercase group-hover:text-accent">
                Sign in <motion.span className="inline-block" whileHover={{ x: 3 }}>→</motion.span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

const MAX = 2555;
const THRESHOLD = 852;
const CUSTODY = 1140;

/** A looping miniature of the whole idea: custody days climb past the §479 threshold and the case flips to eligible. */
function LiveCaseCard() {
  const reduce = useReducedMotion();
  const days = useMotionValue(reduce ? CUSTODY : 0);
  const [shown, setShown] = useState(reduce ? CUSTODY : 0);
  const [stage, setStage] = useState<"counting" | "eligible" | "drafted">(reduce ? "drafted" : "counting");
  const width = useTransform(days, [0, MAX], ["0%", "100%"]);

  useMotionValueEvent(days, "change", (v) => {
    setShown(Math.round(v));
    if (v >= THRESHOLD) setStage((s) => (s === "counting" ? "eligible" : s));
  });

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      if (cancelled) return;
      days.set(0);
      setStage("counting");
      animate(days, CUSTODY, { duration: 3.2, ease: [0.3, 0, 0.2, 1], delay: 0.6 });
      timers = [setTimeout(() => setStage("drafted"), 5200), setTimeout(run, 10000)];
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [days, reduce]);

  const eligible = stage !== "counting";
  const overdue = Math.max(0, shown - THRESHOLD);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
      className="relative"
      aria-label="Animated example: a case crossing the §479 threshold"
    >
      <motion.div
        className="absolute -inset-3 -z-10 border-2 border-dashed border-foreground/20"
        animate={{ rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="border-2 border-foreground bg-panel shadow-[10px_10px_0_0_var(--foreground)]">
        <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2 font-mono text-[10px] tracking-widest uppercase">
          <PulseDot className={eligible ? "bg-accent" : "bg-foreground/40"} />
          Daily sweep · Chennai
          <span className="ml-auto text-foreground/50">example</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg leading-tight uppercase sm:text-xl">Karthikeyan M.</p>
              <p className="font-mono text-[11px] text-foreground/60">IPC 325 · max 7 years · first-time offender</p>
            </div>
            <motion.span
              key={eligible ? "yes" : "no"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className={`border-2 px-2 py-1 font-mono text-[10px] font-bold tracking-widest whitespace-nowrap uppercase ${
                eligible ? "border-accent bg-accent text-white" : "border-foreground/40 text-foreground/60"
              }`}
            >
              {eligible ? "Tier 2 · eligible" : "Not yet"}
            </motion.span>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-end justify-between font-mono text-[10px] tracking-widest text-foreground/60 uppercase">
              <span>Days in custody</span>
              <span className="font-display text-3xl leading-none tracking-tight text-foreground tabular-nums sm:text-4xl">{shown.toLocaleString("en-IN")}</span>
            </div>
            <div className="relative h-5 border-2 border-foreground bg-background">
              <motion.div style={{ width }} className={`h-full ${eligible ? "bg-accent" : "bg-foreground"}`} />
              <Marker at={THRESHOLD} label="1/3 = 852" active={eligible} />
              <Marker at={MAX} label="max 2,555" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase">
              <Cell label="Threshold" value="852 d" />
              <Cell label="Overdue" value={`${overdue.toLocaleString("en-IN")} d`} accent={eligible} />
              <Cell label="Rank" value={eligible ? "#5" : "—"} />
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ height: stage === "drafted" ? "auto" : 0, opacity: stage === "drafted" ? 1 : 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-3 border-2 border-dashed border-ai p-3">
              <span className="font-mono text-[10px] font-bold tracking-widest text-ai uppercase">§479 draft ready</span>
              <span className="ml-auto border-2 border-lawyer px-2 py-0.5 font-mono text-[9px] tracking-widest text-lawyer uppercase">awaiting lawyer</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Marker({ at, label, active }: { at: number; label: string; active?: boolean }) {
  return (
    <div className="absolute top-0 bottom-0" style={{ left: `${(at / MAX) * 100}%` }}>
      <div className={`absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 ${active ? "bg-accent" : "bg-foreground"}`} />
      <span className={`absolute top-full mt-1 -translate-x-full font-mono text-[9px] whitespace-nowrap uppercase ${at < MAX ? "sm:-translate-x-1/2" : ""} ${active ? "text-accent" : "text-foreground/60"}`}>
        {label}
      </span>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border-2 px-2 py-1.5 ${accent ? "border-accent" : "border-foreground/20"}`}>
      <div className="text-foreground/50">{label}</div>
      <div className={`font-display text-sm tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
