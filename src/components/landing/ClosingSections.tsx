"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EASE, Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { SectionHeader } from "./SectionHeader";

const TRUST = [
  { k: "01", t: "Every fact quotes its source", d: "An extracted fact must point to the exact sentence it came from. If the quote isn't there, the fact is thrown away." },
  { k: "02", t: "Read twice, compared", d: "The document is read in two independent passes. If they disagree, a lawyer decides — the system doesn't pick one." },
  { k: "03", t: "Blanks are never assumed", d: "A missing past-conviction record goes to a lawyer. It is never quietly treated as \"no convictions\"." },
  { k: "04", t: "Nobody silently dropped", d: "NDPS and other special-act cases get extra scrutiny, not automatic exclusion. Juveniles are routed to the Juvenile Justice Act, visibly." },
  { k: "05", t: "Every view is logged", d: "Every login, case view and decision is recorded against the lawyer's Bar Council number." },
  { k: "06", t: "Nothing files itself", d: "A licensed lawyer signs every application. There is no submit-to-court button anywhere in the system." },
];

export function TrustSection() {
  return (
    <section id="trust" className="border-b-2 border-foreground bg-panel px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader n="04" eyebrow="Why you can check it, not just trust it">
          Built so a judge can <span className="text-accent">verify every answer.</span>
        </SectionHeader>

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((c) => (
            <StaggerItem key={c.k}>
              <motion.div
                whileHover={{ y: -6, boxShadow: "8px 8px 0 0 var(--accent)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group h-full border-2 border-foreground bg-background p-5"
              >
                <span className="font-mono text-xs text-accent">{c.k}</span>
                <p className="mt-2 font-display text-lg leading-tight uppercase">{c.t}</p>
                <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground/70">{c.d}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/knowledge-base" className="group flex items-center justify-between border-2 border-foreground bg-background p-5 transition-colors hover:border-accent">
              <span>
                <span className="block font-mono text-[10px] tracking-widest text-foreground/60 uppercase">See the law it uses</span>
                <span className="font-display text-xl uppercase">Knowledge base</span>
                <span className="block font-mono text-[11px] text-foreground/60">92 cited sections, IPC ↔ BNS, versioned</span>
              </span>
              <motion.span className="font-display text-3xl group-hover:text-accent" whileHover={{ x: 6 }}>→</motion.span>
            </Link>
            <Link href="/data-sources" className="group flex items-center justify-between border-2 border-foreground bg-background p-5 transition-colors hover:border-accent">
              <span>
                <span className="block font-mono text-[10px] tracking-widest text-foreground/60 uppercase">What is real, what is simulated</span>
                <span className="font-display text-xl uppercase">Data sources</span>
                <span className="block font-mono text-[11px] text-foreground/60">Every part labelled, with the reason</span>
              </span>
              <motion.span className="font-display text-3xl group-hover:text-accent" whileHover={{ x: 6 }}>→</motion.span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-32">
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-display text-4xl leading-[0.95] uppercase sm:text-6xl"
        >
          Not a new job. <span className="text-accent">The one they already have — sorted.</span>
        </motion.p>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl font-mono text-sm leading-relaxed text-foreground/70">
            Built for the legal-aid lawyer already assigned to a district: a ranked list and a ready draft every morning,
            instead of an unsorted backlog.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#demo" className="border-2 border-accent bg-accent px-6 py-3 font-mono text-xs tracking-widest text-white uppercase transition-transform hover:-translate-y-0.5">
              Try the demo ↑
            </a>
            <Link href="/register" className="border-2 border-foreground px-6 py-3 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-foreground hover:text-background">
              Register as DLSA lawyer →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
