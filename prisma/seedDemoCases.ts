/**
 * Populates the pilot district with the synthetic cases from
 * seedData/syntheticCases.ts, run through the REAL pipeline — actual
 * extraction (AI) and actual compute (engine) — not pre-filled fake
 * results. This is what "the flow is perfect" actually means: the same
 * code path a real charge sheet would go through, exercised on synthetic
 * documents that are honestly labeled as such.
 *
 * Costs real NVIDIA API credits (one extraction call + occasionally one
 * draft call per case) and needs NVIDIA_API_KEY set. Safe to re-run —
 * creates new Person/Case rows each time rather than upserting, since
 * these are meant as fresh demo data, not stable fixtures.
 *
 * Usage: npm run db:seed-demo
 */
import { PrismaClient } from "@prisma/client";
import { buildSyntheticCases, buildSyntheticTrackBCase } from "./seedData/syntheticCases";
import { extractFactsWithSelfCheck } from "../src/lib/ai/extraction";
import { buildCaseUpdateFromFacts } from "../src/lib/ai/applyExtraction";
import { computeCase } from "../src/lib/caseCompute";
import { draftApplication } from "../src/lib/ai/drafting";
import { PILOT_DISTRICT_ID } from "./constants";

const prisma = new PrismaClient();

async function main() {
  const district = await prisma.district.findUnique({ where: { id: PILOT_DISTRICT_ID } });
  if (!district) {
    throw new Error(`Pilot district not found — run "npm run db:seed" first.`);
  }

  const cases = buildSyntheticCases();

  for (const c of cases) {
    console.log(`\n--- ${c.label} ---`);

    const person = await prisma.person.create({
      data: { nameVariants: [c.personName], approxAge: c.approxAge },
    });
    const dbCase = await prisma.case.create({
      data: {
        personId: person.id,
        districtId: PILOT_DISTRICT_ID,
        arrestDate: new Date(), // placeholder — extraction below overwrites this with the real date
        custodyStatus: c.custodyStatus,
        isJuvenile: c.isJuvenile,
        specialActFlag: c.specialActFlag,
        pendingCaseFlag: "UNKNOWN",
      },
    });
    console.log(`Created case ${dbCase.id} for ${c.personName}`);

    const facts = await extractFactsWithSelfCheck(c.chargeSheetText);
    await prisma.extractedFact.createMany({
      data: facts.map((f) => ({
        caseId: dbCase.id,
        fieldName: f.fieldName,
        value: f.value,
        sourceSentence: f.sourceSentence,
        confidence: f.confidence,
      })),
    });
    const caseUpdate = buildCaseUpdateFromFacts(facts);
    if (Object.keys(caseUpdate).length > 0) {
      await prisma.case.update({ where: { id: dbCase.id }, data: caseUpdate });
    }
    console.log(`Extracted ${facts.length} facts, applied: ${Object.keys(caseUpdate).join(", ") || "(none)"}`);

    let result;
    try {
      result = await computeCase(dbCase.id);
    } catch (error) {
      console.log(`Compute skipped: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    console.log(
      `Exclusion: ${result.exclusion.status}${"reason" in result.exclusion ? ` (${result.exclusion.reason})` : ""}`
    );
    if (result.formulaResult) {
      console.log(`Tier: ${result.formulaResult.tier ?? "not yet eligible"}, overdue: ${result.formulaResult.overdueDays ?? "—"} days`);
    }
    console.log(`Ground truth expected: exclusion=${c.groundTruth.exclusionStatus}, tier=${c.groundTruth.tier}`);

    if (result.formulaResult?.tier) {
      const fr = await prisma.formulaResult.findUnique({
        where: { caseId: dbCase.id },
        include: { governingSection: true },
      });
      if (fr) {
        const draftText = await draftApplication({
          type: "release",
          personName: c.personName,
          governingSectionCode: fr.governingSection.code,
          applicableFraction: fr.applicableFraction,
          thresholdDays: fr.thresholdDays,
          daysInCustody: fr.daysInCustody,
          overdueDays: fr.overdueDays ?? 0,
          tier: fr.tier === "TIER_1" ? 1 : 2,
        });
        await prisma.application.create({ data: { caseId: dbCase.id, type: "release", draftText } });
        console.log(`Drafted release application (${draftText.length} chars)`);
      }
    }
  }

  // Track B — structural detection, no charge sheet needed.
  const trackB = buildSyntheticTrackBCase();
  console.log(`\n--- ${trackB.label} ---`);
  const person = await prisma.person.create({
    data: { nameVariants: [trackB.personName], approxAge: trackB.approxAge },
  });
  const dbCase = await prisma.case.create({
    data: {
      personId: person.id,
      districtId: PILOT_DISTRICT_ID,
      arrestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400),
      chargedSectionIds: ["IPC_379"],
      custodyStatus: "in_custody",
      bailGranted: true,
      bailOrderDate: trackB.bailOrderDate,
      pendingCaseFlag: "NONE",
    },
  });
  const result = await computeCase(dbCase.id);
  console.log(`Track B flagged: ${result.trackB.status === "flagged"}, days since bail: ${result.trackB.daysSinceBail}`);

  if (result.trackB.status === "flagged" && result.trackB.record) {
    const draftText = await draftApplication({
      type: "surety",
      personName: trackB.personName,
      bailOrderDate: trackB.bailOrderDate.toISOString().slice(0, 10),
      daysSinceBail: result.trackB.daysSinceBail!,
    });
    await prisma.application.create({ data: { caseId: dbCase.id, type: "surety", draftText } });
    console.log(`Drafted surety application (${draftText.length} chars)`);
  }

  console.log("\nDone. Log in and check the dashboard.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
