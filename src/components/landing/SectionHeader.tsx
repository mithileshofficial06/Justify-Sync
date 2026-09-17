"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/Motion";

export function SectionHeader({ n, eyebrow, children, light }: { n: string; eyebrow: string; children: ReactNode; light?: boolean }) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-5 flex items-center gap-3"
      >
        <span className="border-2 border-accent bg-accent px-2 py-0.5 font-mono text-xs text-white">{n}</span>
        <span className={`font-mono text-xs tracking-widest uppercase ${light ? "text-background/60" : "text-foreground/60"}`}>{eyebrow}</span>
        <motion.span
          className={`h-px flex-1 origin-left ${light ? "bg-background/30" : "bg-foreground/25"}`}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
        className="max-w-4xl font-display text-3xl leading-[0.95] tracking-tight uppercase sm:text-5xl lg:text-6xl"
      >
        {children}
      </motion.h2>
    </div>
  );
}
