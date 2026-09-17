"use client";

import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import type { PublicDemoAccount } from "@/lib/demo";
import { Hero } from "./Hero";
import { ProblemSection } from "./ProblemSection";
import { HowItWorks } from "./HowItWorks";
import { TracksSection } from "./TracksSection";
import { FinalCta, TrustSection } from "./ClosingSections";

export function LandingPage({ demoAccounts }: { demoAccounts: PublicDemoAccount[] }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <motion.div aria-hidden style={{ scaleX }} className="fixed top-0 right-0 left-0 z-50 h-1 origin-left bg-accent" />
      <main className="flex-1">
        <Hero demoAccounts={demoAccounts} />
        <ProblemSection />
        <HowItWorks />
        <TracksSection />
        <TrustSection />
        <FinalCta />
      </main>
    </MotionConfig>
  );
}
