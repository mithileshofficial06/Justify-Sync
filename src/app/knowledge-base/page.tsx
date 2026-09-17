import type { Metadata } from "next";
import { db } from "@/lib/db";
import { describeTerm } from "@/lib/engine/explain";
import { Label, H1 } from "@/components/ui";

export const metadata: Metadata = { title: "Knowledge base · JuriSync" };

type Row = Awaited<ReturnType<typeof loadSections>>[number];

function loadSections() {
  return db.knowledgeBaseSection.findMany({ orderBy: [{ law: "asc" }, { id: "asc" }] });
}

const LAW_ORDER = ["IPC", "BNS", "NDPS Act", "Arms Act", "TN Prohibition Act"];

function maxLabel(s: Row) {
  if (s.isFineOnly) return "Fine only";
  if (s.isDeathOrLife && s.maxSentenceDays === 0) return "Death / life";
  if (s.isDeathOrLife) return `Life, or ${describeTerm(s.maxSentenceDays)}`;
  return describeTerm(s.maxSentenceDays);
}

function engineTreatment(s: Row): { text: string; tone: "accent" | "muted" | "plain" } {
  if (s.isGraded && !s.gradedBand && s.isDeathOrLife) return { text: "Human review — band decides carve-out", tone: "accent" };
  if (s.isDeathOrLife) return { text: "Excluded — §479 carve-out", tone: "muted" };
  if (s.isFineOnly) return { text: "Tier 1 from day one", tone: "accent" };
  if (s.isSpecialAct) return { text: "Ranked + stricter scrutiny", tone: "accent" };
  if (s.isGraded && !s.gradedBand) return { text: "Conservative (higher) max", tone: "plain" };
  return { text: "Ranked", tone: "plain" };
}

export default async function KnowledgeBasePage() {
  const sections = await loadSections();
  const byId = new Map(sections.map((s) => [s.id, s]));
  const versions = [...new Set(sections.map((s) => s.version))];
  const rank = (law: string) => (LAW_ORDER.includes(law) ? LAW_ORDER.indexOf(law) : LAW_ORDER.length);
  const laws = [...new Set(sections.map((s) => s.law))].sort((a, b) => rank(a) - rank(b));

  const counts = {
    total: sections.length,
    graded: sections.filter((s) => s.isGraded).length,
    deathOrLife: sections.filter((s) => s.isDeathOrLife).length,
    fineOnly: sections.filter((s) => s.isFineOnly).length,
    stateOrSpecial: sections.filter((s) => s.law !== "IPC" && s.law !== "BNS").length,
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Label>Statutory knowledge base · read only</Label>
      <div className="mt-1 mb-3">
        <H1>Knowledge base</H1>
      </div>
      <p className="mb-6 max-w-3xl font-mono text-xs leading-relaxed text-foreground/70">
        Every eligibility decision starts here: the maximum sentence for the governing section. The AI never
        supplies this number — it is looked up from this versioned, cited table, so anyone can check it
        against the Bare Act. Each IPC section is paired with its BNS successor; where the BNS changed the
        punishment, each code keeps its own maximum.
      </p>

      <div className="mb-8 flex flex-wrap gap-2 font-mono text-xs uppercase">
        <span className="border-2 border-accent bg-accent px-2 py-1 text-white">Version {versions.join(", ")}</span>
        <span className="border-2 border-foreground px-2 py-1">{counts.total} sections</span>
        <span className="border-2 border-foreground px-2 py-1">{counts.graded} graded</span>
        <span className="border-2 border-foreground px-2 py-1">{counts.deathOrLife} death / life</span>
        <span className="border-2 border-foreground px-2 py-1">{counts.fineOnly} fine only</span>
        <span className="border-2 border-foreground px-2 py-1">{counts.stateOrSpecial} special &amp; state act</span>
      </div>

      {sections.length === 0 && (
        <p className="font-mono text-xs text-foreground/50 uppercase">Knowledge base is empty — run npm run db:seed.</p>
      )}

      {laws.map((law) => {
        const rows = sections.filter((s) => s.law === law);
        return (
          <section key={law} className="mb-10">
            <div className="mb-3 flex items-baseline gap-3 border-b-2 border-foreground pb-2">
              <h2 className="font-display text-lg tracking-tight uppercase">{law}</h2>
              <span className="border-2 border-foreground px-1.5 font-mono text-xs">{rows.length}</span>
            </div>
            <div className="overflow-x-auto border-2 border-foreground">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground bg-foreground text-left font-mono text-[10px] tracking-widest text-background uppercase">
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Offence &amp; punishment</th>
                    <th className="px-3 py-2">Max used</th>
                    <th className="px-3 py-2">Days</th>
                    <th className="px-3 py-2">Engine treats as</th>
                    <th className="px-3 py-2">Citation &amp; notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const t = engineTreatment(s);
                    const eq = s.equivalentId ? byId.get(s.equivalentId) : null;
                    return (
                      <tr key={s.id} id={s.id} className="border-b border-foreground/20 align-top last:border-0">
                        <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">
                          {s.code}
                          {eq && (
                            <div className="mt-1 text-[10px] font-normal text-foreground/50">
                              ≈ {eq.law} {eq.code}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{s.title}</div>
                          <div className="mt-1 font-mono text-[11px] text-foreground/60">{s.punishment}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.isGraded && (
                              <span className="border border-foreground/40 px-1 font-mono text-[9px] uppercase">
                                Graded{s.gradedBand ? ` · ${s.gradedBand}` : " · band not established"}
                              </span>
                            )}
                            {s.isSpecialAct && (
                              <span className="border border-accent px-1 font-mono text-[9px] text-accent uppercase">Special act</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap">{maxLabel(s)}</td>
                        <td className="px-3 py-2 font-mono">{s.isFineOnly || s.maxSentenceDays === 0 ? "—" : s.maxSentenceDays.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block font-mono text-[10px] uppercase ${
                              t.tone === "accent" ? "text-accent" : t.tone === "muted" ? "text-foreground/50" : ""
                            }`}
                          >
                            {t.text}
                          </span>
                        </td>
                        <td className="max-w-xs px-3 py-2 font-mono text-[11px]">
                          <div>{s.citation}</div>
                          {s.notes && <div className="mt-1 text-foreground/55">{s.notes}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="font-mono text-[11px] text-foreground/50 uppercase">
        Conversion: 1 year = 365 days, 1 month = 30 days. IPC ↔ BNS correspondence per the BPRD / CAPT Bhopal
        comparison summary. Verify against the current Bare Act before relying on any row in court.
      </p>
    </main>
  );
}
