import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { FUNNEL_STAGES, getStateOverview, type FunnelCounts } from "@/lib/queries/stateOverview";
import { Label, H1 } from "@/components/ui";
import { GrowBar, Reveal } from "@/components/motion/Motion";

function pct(n: number | null) {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}

export default async function StateOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STATE_ADMIN") redirect("/");

  const { districts, total } = await getStateOverview();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <Label>State legal services authority · Tamil Nadu</Label>
      <div className="mt-1 mb-3">
        <H1>State overview</H1>
      </div>
      <p className="mb-6 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/65">
        The national funnel, but live and per district: of the people JuriSync identified as eligible, how many were
        filed for, granted bail, and actually released. Every drop is a separate failure with a name on the Stalled page.
        Counts cover cases this system tracks, not the total prison population.
      </p>

      <Reveal><section className="mb-8 border-2 border-foreground bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-lg uppercase">All districts</h2>
          <span className="ml-auto font-mono text-[10px] tracking-widest text-foreground/60 uppercase">
            Filing rate {pct(total.filingRate)} · release rate {pct(total.releaseRate)}
          </span>
        </div>
        <Funnel funnel={total.funnel} large />
        <p className="mt-3 font-mono text-[10px] text-foreground/55 uppercase">
          National, Jan–Mar 2024: 15,777 recommended → 12,395 filed (79%) → 7,421 released (60% of filed)
        </p>
      </section></Reveal>

      <Reveal delay={0.1}><div className="mb-8 overflow-x-auto border-2 border-foreground">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b-2 border-foreground bg-foreground text-left font-mono text-[10px] tracking-widest text-background uppercase">
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Tracked</th>
              <th className="px-3 py-2">Tier 1</th>
              <th className="px-3 py-2">Tier 2</th>
              <th className="px-3 py-2">Track B</th>
              <th className="px-3 py-2">Filing rate</th>
              <th className="px-3 py-2">Release rate</th>
              <th className="px-3 py-2">Needs review</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {districts.map((d) => (
              <tr key={d.districtId} className="border-b border-foreground/20 last:border-0">
                <td className="px-3 py-2 font-sans font-bold">{d.districtName}</td>
                <td className="px-3 py-2">{d.tracked}</td>
                <td className="px-3 py-2 text-accent">{d.tier1}</td>
                <td className="px-3 py-2">{d.tier2}</td>
                <td className="px-3 py-2">{d.trackB}</td>
                <td className="px-3 py-2">{pct(d.filingRate)}</td>
                <td className="px-3 py-2">{pct(d.releaseRate)}</td>
                <td className="px-3 py-2">{d.needsReview}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-foreground bg-background font-bold">
              <td className="px-3 py-2 font-sans">Total</td>
              <td className="px-3 py-2">{total.tracked}</td>
              <td className="px-3 py-2 text-accent">{total.tier1}</td>
              <td className="px-3 py-2">{total.tier2}</td>
              <td className="px-3 py-2">{total.trackB}</td>
              <td className="px-3 py-2">{pct(total.filingRate)}</td>
              <td className="px-3 py-2">{pct(total.releaseRate)}</td>
              <td className="px-3 py-2">{total.needsReview}</td>
            </tr>
          </tbody>
        </table>
      </div></Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        {districts.map((d) => (
          <section key={d.districtId} className="border-2 border-foreground bg-panel p-3">
            <h3 className="mb-2 font-display text-sm uppercase">{d.districtName}</h3>
            <Funnel funnel={d.funnel} />
          </section>
        ))}
      </div>
    </main>
  );
}

function Funnel({ funnel, large }: { funnel: FunnelCounts; large?: boolean }) {
  const top = Math.max(1, funnel.identified);
  return (
    <ol className="flex flex-col gap-1">
      {FUNNEL_STAGES.map((s, i) => {
        const value = funnel[s.key];
        const prev = i > 0 ? funnel[FUNNEL_STAGES[i - 1].key] : null;
        const lost = prev !== null ? prev - value : 0;
        const last = s.key === "released";
        return (
          <li key={s.key} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 font-mono text-[11px]">
            <span className="text-foreground/65 uppercase">{s.label}</span>
            <div className={`border border-foreground/30 ${large ? "h-5" : "h-3"}`}>
              <GrowBar pct={(value / top) * 100} className="h-full" barClassName={last ? "bg-accent" : "bg-foreground"} delay={i * 0.12} />
            </div>
            <span className="w-16 text-right">
              <span className="font-bold">{value}</span>
              {lost > 0 && <span className="text-accent"> −{lost}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
