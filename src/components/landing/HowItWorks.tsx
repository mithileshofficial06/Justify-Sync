"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { EASE } from "@/components/motion/Motion";
import { ActorTag, type Actor } from "@/components/case/Provenance";
import { SectionHeader } from "./SectionHeader";

const STEPS: { actor: Actor; title: string; body: string }[] = [
  {
    actor: "SYSTEM",
    title: "A case comes in",
    body: "Every day, each undertrial record in the district is picked up — the charge sheet, the court status and the custody status.",
  },
  {
    actor: "AI",
    title: "AI reads — and has to quote",
    body: "AI pulls out the arrest date, the charges and past convictions. Every fact must quote the exact sentence it came from. Anything vague is thrown out, never guessed.",
  },
  {
    actor: "RULES",
    title: "Fixed rules decide",
    body: "Plain arithmetic on a cited law table: the maximum sentence, the 1/3 or 1/2 share of it, and days already spent inside. No AI touches this step — anyone can check it with a calculator.",
  },
  {
    actor: "RULES",
    title: "Everyone ranked, every day",
    body: "Whoever is most overdue goes to the top. People held longer than the maximum sentence itself — Tier 1 — always come first.",
  },
  {
    actor: "LAWYER",
    title: "A draft the lawyer signs",
    body: "JuriSync writes the §479 release application from the computed facts. The district's legal-aid lawyer reviews and signs it. Nothing is ever filed automatically.",
  },
  {
    actor: "SYSTEM",
    title: "Followed until they walk out",
    body: "Filed, heard, bail, released — every step is tracked. If a case stops moving, the district admin is alerted the next morning.",
  },
];

export function HowItWorks() {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [step, setStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length))));
  });

  function jumpTo(i: number) {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / STEPS.length) * scrollable, behavior: "smooth" });
  }

  return (
    <section id="how" className="relative scroll-mt-4 border-b-2 border-foreground bg-panel">
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:pt-28">
        <SectionHeader n="02" eyebrow="How JuriSync works">
          AI reads. <span className="text-foreground/40">Fixed rules decide.</span> <span className="text-accent">A lawyer signs.</span>
        </SectionHeader>
        <p className="mt-5 max-w-2xl font-mono text-sm leading-relaxed text-foreground/70">
          Six steps, scroll through them. The one design rule: the AI only reads and writes — it never decides who is eligible.
        </p>
      </div>

      <div ref={track} style={{ height: `${STEPS.length * 85}vh` }} className="relative">
        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden py-6">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            {/* Mobile: compact progress + current step */}
            <div className="lg:hidden">
              <div className="mb-3 flex gap-1">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => jumpTo(i)} aria-label={`Step ${i + 1}`} className="h-1.5 flex-1 bg-foreground/15">
                    <motion.span className="block h-full bg-accent" animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-accent">0{step + 1}</span>
                    <ActorTag actor={STEPS[step].actor} />
                  </div>
                  <h3 className="mt-1 font-display text-2xl leading-tight uppercase">{STEPS[step].title}</h3>
                  <p className="mt-1 font-mono text-[12px] leading-relaxed text-foreground/70">{STEPS[step].body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop: full step list with progress rail */}
            <ol className="relative hidden flex-col gap-1 lg:flex">
              <div className="absolute top-2 bottom-2 left-[15px] w-0.5 bg-foreground/15">
                <motion.div className="w-full origin-top bg-accent" style={{ scaleY: progress, height: "100%" }} />
              </div>
              {STEPS.map((s, i) => {
                const active = i === step;
                return (
                  <li key={s.title}>
                    <button onClick={() => jumpTo(i)} className="group relative flex w-full gap-4 py-2 text-left">
                      <motion.span
                        animate={{ scale: active ? 1.15 : 1 }}
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center border-2 font-mono text-xs transition-colors ${
                          active ? "border-accent bg-accent text-white" : i < step ? "border-foreground bg-foreground text-background" : "border-foreground/30 bg-panel text-foreground/50"
                        }`}
                      >
                        {i + 1}
                      </motion.span>
                      <span className="min-w-0 flex-1">
                        <span className={`flex items-center gap-2 font-display text-lg uppercase transition-colors ${active ? "" : "text-foreground/45 group-hover:text-foreground/80"}`}>
                          {s.title}
                        </span>
                        <AnimatePresence initial={false}>
                          {active && (
                            <motion.span
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.35, ease: EASE }}
                              className="block overflow-hidden"
                            >
                              <span className="mt-1 mb-1 block">
                                <ActorTag actor={s.actor} />
                              </span>
                              <span className="block font-mono text-[13px] leading-relaxed text-foreground/70">{s.body}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="relative h-[21rem] border-2 border-foreground bg-background shadow-[8px_8px_0_0_var(--foreground)] sm:h-[26rem]">
              <div className="flex items-center gap-2 border-b-2 border-foreground px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="h-2 w-2 rounded-full bg-foreground/30" />
                <span className="h-2 w-2 rounded-full bg-foreground/30" />
                <span className="ml-2 text-foreground/60">Step {step + 1} of {STEPS.length}</span>
              </div>
              <div className="relative h-[calc(100%-30px)] overflow-hidden p-3 sm:p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="h-full"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    {step === 0 && <DocumentStage />}
                    {step === 1 && <DocumentStage reading />}
                    {step === 2 && <RulesStage />}
                    {step === 3 && <RankStage />}
                    {step === 4 && <DraftStage />}
                    {step === 5 && <TrackStage />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const DOC_LINES: { text: string; fact?: string; hedged?: boolean }[] = [
  { text: "The accused is charged under Sections 325 and 323 IPC.", fact: "Charges: IPC 325, 323" },
  { text: "The accused was arrested on 12.04.2022.", fact: "Arrested: 12-04-2022" },
  { text: "No previous conviction is recorded against the accused.", fact: "Past convictions: none" },
  { text: "A similar name appears at another station; however, it is not linked with certainty.", fact: "Other cases: unclear", hedged: true },
];

function DocumentStage({ reading = false }: { reading?: boolean }) {
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[1.2fr_1fr]">
      <div className="relative overflow-hidden border-2 border-foreground/70 bg-panel p-3 sm:p-4">
        {!reading && (
          <motion.span
            className="absolute top-2 right-2 border-2 border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-background uppercase"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            Incoming
          </motion.span>
        )}
        <p className="font-mono text-[9px] tracking-widest text-foreground/50 uppercase">Final report · Sec. 193 BNSS</p>
        <p className="mb-3 font-display text-xs uppercase">Chennai · FIR 214/2022</p>
        <ul className="flex flex-col gap-2">
          {DOC_LINES.map((l, i) => (
            <motion.li
              key={l.text}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reading ? 0 : 0.25 + i * 0.35, duration: 0.35 }}
              className="relative font-serif text-[12px] leading-snug sm:text-[13px]"
            >
              {reading && (
                <motion.span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 -z-0 ${l.hedged ? "bg-accent/20" : "bg-ai/20"}`}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.3 + i * 0.55, duration: 0.45, ease: EASE }}
                />
              )}
              <span className={`relative ${reading && l.hedged ? "line-through decoration-accent decoration-2" : ""}`}>{l.text}</span>
            </motion.li>
          ))}
        </ul>
        {!reading && (
          <div className="mt-4 flex flex-col gap-1.5">
            {[90, 70, 80].map((w, i) => (
              <motion.div key={i} className="h-1.5 bg-foreground/10" initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 1.6 + i * 0.15, duration: 0.4 }} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {reading ? (
          DOC_LINES.map((l, i) => (
            <motion.div
              key={l.fact}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.65 + i * 0.55, type: "spring", stiffness: 300, damping: 22 }}
              className={`border-2 px-2 py-1.5 font-mono text-[11px] ${l.hedged ? "border-accent text-accent" : "border-dashed border-ai text-ai"}`}
            >
              <span className="font-bold">{l.fact}</span>
              <span className="block text-[9px] tracking-widest uppercase opacity-80">{l.hedged ? "Hedged — not guessed, sent to lawyer" : "✓ Exact sentence quoted"}</span>
            </motion.div>
          ))
        ) : (
          <div className="hidden h-full flex-col justify-center gap-2 sm:flex">
            {["Charge sheet", "Court status", "Custody status"].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.25 }}
                className="flex items-center gap-2 border-2 border-foreground/30 px-2 py-2 font-mono text-[11px] uppercase"
              >
                <motion.span className="h-2 w-2 rounded-full bg-lawyer" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }} />
                {s}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const RULE_LINES = [
  ["Governing section", "IPC 325 (highest maximum)"],
  ["Maximum sentence", "7 years = 2,555 days"],
  ["Past convictions", "none → fraction 1/3"],
  ["Threshold", "2,555 × 1/3 = 852 days"],
  ["Days in custody", "1,140"],
];

function RulesStage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <ActorTag actor="RULES">Fixed rule · no AI</ActorTag>
        <span className="font-mono text-[10px] text-foreground/50 uppercase">check it with a calculator</span>
      </div>
      <div className="flex-1 border-2 border-foreground bg-panel p-3 font-mono text-[12px] sm:p-4 sm:text-sm">
        {RULE_LINES.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.3, duration: 0.3 }}
            className="grid grid-cols-[8.5rem_1fr] gap-2 py-0.5 sm:grid-cols-[10rem_1fr]"
          >
            <span className="text-foreground/55">{k}</span>
            <span className="font-bold">{v}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, duration: 0.3 }}
          className="mt-2 border-t border-dashed border-foreground/40 pt-2 text-lg font-bold sm:text-2xl"
        >
          1,140 ≥ 852
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 1.6, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 2.2, type: "spring", stiffness: 260, damping: 16 }}
        className="mt-2 border-2 border-accent bg-accent px-3 py-2 text-center font-display text-base text-white uppercase sm:text-xl"
      >
        Tier 2 eligible · 288 days overdue
      </motion.div>
    </div>
  );
}

const PEOPLE = [
  { name: "Balamurugan S.", tier: 2, overdue: 635 },
  { name: "Senthil K.", tier: 1, overdue: 40 },
  { name: "Karthikeyan M.", tier: 2, overdue: 288 },
  { name: "Muthu Krishnan", tier: 1, overdue: 835 },
  { name: "Selvaraj A.", tier: 2, overdue: 548 },
];

function RankStage() {
  const [sorted, setSorted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSorted(true), 1100);
    return () => clearTimeout(t);
  }, []);
  const rows = sorted ? [...PEOPLE].sort((a, b) => a.tier - b.tier || b.overdue - a.overdue) : PEOPLE;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase">
        <span className="text-foreground/60">Chennai · today</span>
        <motion.span key={String(sorted)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={sorted ? "text-accent" : "text-foreground/50"}>
          {sorted ? "Ranked ✓" : "Unsorted backlog…"}
        </motion.span>
      </div>
      <LayoutGroup>
        <ul className="flex flex-col gap-1.5">
          {rows.map((p, i) => (
            <motion.li
              layout
              key={p.name}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-2 border-2 bg-panel px-2 py-1.5 sm:py-2 ${
                sorted && p.tier === 1 ? "border-accent" : "border-foreground/40"
              }`}
            >
              <span className="font-mono text-[10px] text-foreground/50">{sorted ? `#${i + 1}` : "·"}</span>
              <span className="truncate font-display text-xs uppercase sm:text-sm">{p.name}</span>
              <span className={`border px-1 font-mono text-[9px] uppercase ${p.tier === 1 ? "border-accent text-accent" : "border-foreground/40"}`}>
                Tier {p.tier}
              </span>
              <span className={`w-14 text-right font-display text-sm tabular-nums sm:text-base ${sorted && p.tier === 1 ? "text-accent" : ""}`}>{p.overdue}d</span>
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>
      <AnimatePresence>
        {sorted && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-auto pt-2 font-mono text-[10px] text-foreground/60 uppercase">
            Tier 1 first — held longer than the maximum sentence — then most overdue
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const DRAFT = [
  "APPLICATION UNDER SECTION 479 BNSS",
  "The applicant has remained in custody for 1,140 days.",
  "The applicable threshold is 852 days (1/3 of 2,555).",
  "It is prayed that the applicant be released on bond.",
];

function DraftStage() {
  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <ActorTag actor="AI">Drafted from computed facts</ActorTag>
      </div>
      <div className="relative flex-1 border-2 border-dashed border-ai bg-panel p-3 sm:p-4">
        {DRAFT.map((line, i) => (
          <motion.p
            key={line}
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ delay: 0.2 + i * 0.45, duration: 0.5, ease: "linear" }}
            className={`font-mono leading-relaxed ${i === 0 ? "mb-2 text-[11px] font-bold sm:text-xs" : "text-[11px] sm:text-[13px]"}`}
          >
            {line}
          </motion.p>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 2, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: 2.3, type: "spring", stiffness: 240, damping: 14 }}
          className="absolute right-3 bottom-3 border-4 border-lawyer px-3 py-1.5 font-display text-sm text-lawyer uppercase sm:text-lg"
        >
          Signed · Counsel
        </motion.div>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }} className="mt-2 font-mono text-[10px] text-foreground/65 uppercase">
        There is no &ldquo;submit to court&rdquo; button anywhere in JuriSync.
      </motion.p>
    </div>
  );
}

const TRACK = ["Identified", "Filed", "Heard", "Bail granted", "Released"];

function TrackStage() {
  const [reached, setReached] = useState(0);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setReached(1), 500),
      setTimeout(() => setStalled(true), 1000),
      setTimeout(() => {
        setStalled(false);
        setReached(2);
      }, 2600),
      setTimeout(() => setReached(3), 3200),
      setTimeout(() => setReached(4), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="relative px-2">
        <div className="absolute top-4 right-6 left-6 h-1 bg-foreground/15">
          <motion.div className="h-full bg-lawyer" animate={{ width: `${(reached / (TRACK.length - 1)) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
        <ol className="relative flex justify-between">
          {TRACK.map((t, i) => (
            <li key={t} className="flex w-16 flex-col items-center gap-2 text-center">
              <motion.span
                animate={{ scale: i === reached ? 1.2 : 1 }}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-xs transition-colors ${
                  i <= reached ? (i === TRACK.length - 1 && reached === i ? "border-lawyer bg-lawyer text-white" : "border-foreground bg-foreground text-background") : "border-foreground/30 bg-panel text-foreground/40"
                }`}
              >
                {i <= reached ? "✓" : i + 1}
              </motion.span>
              <span className={`font-mono text-[9px] leading-tight uppercase sm:text-[10px] ${i <= reached ? "" : "text-foreground/40"}`}>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          {stalled ? (
            <motion.div
              key="stall"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, x: [0, -4, 4, -3, 3, 0] }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="border-2 border-accent bg-accent/10 p-3"
            >
              <p className="font-mono text-[10px] font-bold tracking-widest text-accent uppercase">Stalled · escalated</p>
              <p className="mt-1 font-mono text-[12px]">Filed 60 days ago with no hearing — district admin alerted by email.</p>
            </motion.div>
          ) : reached === TRACK.length - 1 ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="border-2 border-lawyer bg-lawyer/10 p-3">
              <p className="font-mono text-[10px] font-bold tracking-widest text-lawyer uppercase">Released</p>
              <p className="mt-1 font-mono text-[12px]">Not just a list: every case is followed until the person walks out.</p>
            </motion.div>
          ) : (
            <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[11px] text-foreground/60 uppercase">
              Tracking status from eCourts and the lawyer…
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
