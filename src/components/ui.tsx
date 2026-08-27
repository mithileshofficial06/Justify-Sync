import Link from "next/link";
import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-2 border-foreground bg-panel ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-widest text-foreground/60 uppercase">{children}</span>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-4xl leading-[0.95] tracking-tight uppercase sm:text-5xl">
      {children}
    </h1>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl tracking-tight uppercase">{children}</h2>;
}

export function Button({
  children,
  variant = "solid",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" }) {
  const base = "border-2 border-foreground px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors disabled:opacity-40";
  const solid = "bg-foreground text-background hover:bg-accent hover:border-accent";
  const outline = "bg-transparent text-foreground hover:bg-foreground hover:text-background";
  return (
    <button {...props} className={`${base} ${variant === "solid" ? solid : outline} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="border-2 border-foreground bg-foreground px-4 py-2 font-mono text-xs tracking-widest text-background uppercase transition-colors hover:bg-accent hover:border-accent"
    >
      {children}
    </Link>
  );
}

export function StatBlock({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="border-2 border-foreground p-4">
      <div className={`font-display text-3xl uppercase sm:text-4xl ${accent ? "text-accent" : ""}`}>{value}</div>
      <div className="mt-1 font-mono text-[11px] tracking-widest text-foreground/60 uppercase">{label}</div>
    </div>
  );
}

export function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="border-2 border-accent bg-accent px-2 py-0.5 font-mono text-xs text-white">{n}</span>
      <Label>{children}</Label>
    </div>
  );
}

export function Badge({ tone = "default", children }: { tone?: "default" | "accent"; children: ReactNode }) {
  return (
    <span
      className={`border-2 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
        tone === "accent" ? "border-accent bg-accent text-white" : "border-foreground text-foreground"
      }`}
    >
      {children}
    </span>
  );
}
