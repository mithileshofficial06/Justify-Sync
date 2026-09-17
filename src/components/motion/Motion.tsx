"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";

export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Fades and lifts its children in when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct StaggerItem children as they enter the viewport (or on mount with `onMount`). */
export function Stagger({
  children,
  className,
  gap = 0.07,
  onMount = false,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  onMount?: boolean;
  as?: "div" | "ul" | "ol";
}) {
  const Tag = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  const trigger = onMount ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-40px" } };
  return (
    <Tag className={className} initial="hidden" {...trigger} variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag className={className} variants={fadeUp}>
      {children}
    </Tag>
  );
}

function format(v: number, decimals: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Counts up to `value` when visible. The final value is always present in the
 * DOM for screen readers and text search; only the visual digits animate.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.2,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  const display = reduce ? value : inView ? shown : 0;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{`${prefix}${format(value, decimals)}${suffix}`}</span>
      <span aria-hidden>{`${prefix}${format(display, decimals)}${suffix}`}</span>
    </span>
  );
}

/** A horizontal bar that grows to `pct` (0–100) when visible. */
export function GrowBar({ pct, className, delay = 0, barClassName = "bg-foreground" }: { pct: number; className?: string; delay?: number; barClassName?: string }) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        className={`h-full ${barClassName}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 1, ease: EASE, delay }}
      />
    </div>
  );
}

/** Soft pulsing dot, used to mark live / urgent items. */
export function PulseDot({ className = "bg-accent" }: { className?: string }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${className}`}
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
      />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${className}`} />
    </span>
  );
}
