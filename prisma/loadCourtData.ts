/**
 * SIH build Module 3: loads a district slice of public court metadata (see
 * src/lib/courtData/slice.ts for the CSV format, scripts/prepareDdlSlice.ts to
 * produce one from the DDL dataset) and runs computeCase() over every loaded case.
 *
 * Court metadata has no antecedents or other-pending-cases field. By default
 * those stay unknown, so the engine routes the cases to human review — it never
 * assumes. With --priors synthetic-none the loader instead records "no prior
 * conviction / no other pending case" as facts explicitly labelled SYNTHETIC,
 * so the real sections and dates can be ranked in a demo. The label shows on
 * every screen that uses the value.
 *
 * Usage:
 *   npm run data:load-ecourts -- --file data/chennai-2018.csv \
 *     --dataset "DDL Judicial Data 2018" [--district pilot-district] \
 *     [--snapshot 2018-12-31] [--priors review|synthetic-none] [--limit 200]
 *
 * Idempotent per dataset: rows carry fixtureKey "ecourts:<dataset>:<case_ref>"
 * and are replaced on re-run.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { computeCase } from "../src/lib/caseCompute";
import { storeExtractedFacts, type FactToStore } from "../src/lib/extractedFactStore";
import { mapSlice, parseCsv, parseDate, toRecords } from "../src/lib/courtData/slice";
import { formatDateDMY } from "../src/lib/engine/explain";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const arg = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`Missing --${name}`);
  return v;
};

async function main() {
  const file = arg("file");
  const dataset = arg("dataset");
  const districtId = arg("district", "pilot-district");
  const priors = arg("priors", "review");
  const limit = Number(arg("limit", "0"));
  const defaultSnapshot = argv.includes("--snapshot") ? parseDate(arg("snapshot")) ?? undefined : undefined;
  if (!["review", "synthetic-none"].includes(priors)) throw new Error("--priors must be review or synthetic-none");

  const district = await prisma.district.findUniqueOrThrow({ where: { id: districtId } });
  const kbIds = new Set((await prisma.knowledgeBaseSection.findMany({ select: { id: true } })).map((s) => s.id));

  const slice = mapSlice(toRecords(parseCsv(readFileSync(file, "utf8"))), kbIds, defaultSnapshot);
  const toLoad = limit > 0 ? slice.cases.slice(0, limit) : slice.cases;
  const slug = dataset.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const prefix = `ecourts:${slug}:`;

  const previous = await prisma.case.findMany({ where: { fixtureKey: { startsWith: prefix } }, select: { id: true, personId: true } });
  if (previous.length) {
    const ids = previous.map((c) => c.id);
    await prisma.$transaction([
      prisma.extractedFact.deleteMany({ where: { caseId: { in: ids } } }),
      prisma.formulaResult.deleteMany({ where: { caseId: { in: ids } } }),
      prisma.trackBFlag.deleteMany({ where: { caseId: { in: ids } } }),
      prisma.application.deleteMany({ where: { caseId: { in: ids } } }),
      prisma.caseStatusEvent.deleteMany({ where: { caseId: { in: ids } } }),
      prisma.case.deleteMany({ where: { id: { in: ids } } }),
    ]);
    await prisma.person.deleteMany({ where: { id: { in: previous.map((c) => c.personId) }, cases: { none: {} } } });
    console.log(`Replaced ${previous.length} case(s) previously loaded from "${dataset}".`);
  }

  const tally = { tier1: 0, tier2: 0, notYet: 0, review: 0, excluded: 0, failed: 0 };

  for (const sc of toLoad) {
    const person = await prisma.person.create({ data: { nameVariants: [`Undertrial ${sc.caseRef}`] } });
    const dbCase = await prisma.case.create({
      data: {
        personId: person.id,
        districtId,
        arrestDate: sc.arrestDate,
        arrestDateIsProxy: sc.arrestDateIsProxy,
        arrestDateProxyNote: sc.arrestDateIsProxy
          ? `court metadata records no arrest date, so the filing date ${formatDateDMY(sc.arrestDate)} is used`
          : null,
        custodyAsOf: sc.snapshotDate,
        chargedSectionIds: sc.sectionIds,
        custodyStatus: "in_custody",
        custodySource: "SIMULATED",
        pendingCaseFlag: priors === "synthetic-none" ? "NONE" : "UNKNOWN",
        dataSource: "ECOURTS_METADATA",
        sourceDataset: `${dataset} · ${district.name} · snapshot ${formatDateDMY(sc.snapshotDate)}`,
        sourceRef: sc.caseRef,
        fixtureKey: `${prefix}${sc.caseRef}`,
      },
    });

    const metadataNote = `Court metadata record ${sc.caseRef} (${dataset}).`;
    const facts: Omit<FactToStore, "caseId">[] = [
      { fieldName: "chargedSections", value: sc.sectionLabels.join(", "), sourceSentence: metadataNote, confidence: 1, method: "COURT_METADATA" },
      {
        fieldName: "arrestDate",
        value: sc.arrestDate.toISOString().slice(0, 10),
        sourceSentence: sc.arrestDateIsProxy ? `${metadataNote} Filing date — no arrest date is recorded in court metadata.` : metadataNote,
        confidence: 1,
        method: "COURT_METADATA",
      },
    ];
    if (priors === "synthetic-none") {
      const synthetic = "Not in court metadata. Recorded as a labelled synthetic value so this real record can be ranked in the demo — confirm before filing.";
      facts.push(
        { fieldName: "priorConvictions", value: "false", sourceSentence: synthetic, confidence: 0.9, method: "SYNTHETIC_ASSUMPTION" },
        { fieldName: "otherPendingCases", value: "false", sourceSentence: synthetic, confidence: 0.9, method: "SYNTHETIC_ASSUMPTION" }
      );
    }
    await storeExtractedFacts(facts.map((f) => ({ ...f, caseId: dbCase.id })));

    try {
      const result = await computeCase(dbCase.id);
      const tier = result.formulaResult?.tier;
      if (result.exclusion.status === "excluded") tally.excluded++;
      else if (result.exclusion.status === "needs_human_review") tally.review++;
      else if (tier === "TIER_1") tally.tier1++;
      else if (tier === "TIER_2") tally.tier2++;
      else tally.notYet++;

      if (tier) {
        await prisma.$transaction([
          prisma.caseStatusEvent.create({
            data: { caseId: dbCase.id, status: "IDENTIFIED", source: "SYSTEM", note: `Identified from ${dataset} snapshot`, eventTime: new Date() },
          }),
          prisma.case.update({ where: { id: dbCase.id }, data: { caseStatus: "IDENTIFIED", statusUpdatedAt: new Date() } }),
        ]);
      }
    } catch (error) {
      tally.failed++;
      console.error(`  ${sc.caseRef}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const topUnmatched = [...slice.unmatchedSections.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const summary = [
    `Dataset: ${dataset} · district ${district.name}`,
    `Cases in file: ${slice.totalCases}`,
    `Loaded: ${toLoad.length}${limit > 0 && slice.cases.length > limit ? ` (of ${slice.cases.length} loadable, --limit ${limit})` : ""}`,
    `Skipped — disposed: ${slice.skipped.disposed}, section not in knowledge base: ${slice.skipped.section_not_in_kb}, missing date: ${slice.skipped.missing_date}, date after snapshot: ${slice.skipped.future_date}`,
    `Outcomes — Tier 1: ${tally.tier1}, Tier 2: ${tally.tier2}, not yet eligible: ${tally.notYet}, needs review: ${tally.review}, excluded: ${tally.excluded}, failed: ${tally.failed}`,
    `Prior convictions: ${priors === "synthetic-none" ? "labelled synthetic value 'none'" : "unknown — routed to review"}`,
    topUnmatched.length ? `Sections blocking the most cases:\n  ${topUnmatched.map(([s, n]) => `${s}: ${n}`).join("\n  ")}` : "",
  ].filter(Boolean);
  console.log(`\n${summary.join("\n")}`);

  await prisma.auditLog.create({
    data: { actorUserId: null, action: `load_court_metadata: ${dataset} — loaded ${toLoad.length}, skipped ${slice.totalCases - slice.cases.length}`, entity: "System" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
