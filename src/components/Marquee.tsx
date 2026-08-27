const ITEMS = [
  "SECTION 479 BNSS",
  "AI READS + WRITES",
  "FIXED RULES DECIDE",
  "HUMAN SIGNS OFF, ALWAYS",
  "DAILY, NOT QUARTERLY",
];

export function Marquee() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-b-2 border-foreground bg-accent py-1.5 text-white">
      <div className="marquee-track flex w-max gap-8 whitespace-nowrap font-mono text-xs tracking-widest uppercase">
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <span>{item}</span>
            <span aria-hidden>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
