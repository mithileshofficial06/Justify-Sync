/**
 * Loads the SIH demo dataset (seedData/sihCases.ts) through the real pipeline:
 * grounded facts are stored encrypted, applied to the case, computeCase()
 * decides exclusions/tier/Track B, drafts are attached, and the status
 * history is written. No live LLM call unless --live-ai is passed.
 *
 * Idempotent: rows it owns carry a fixtureKey starting "sih-" and are replaced
 * on every run. Nothing else is touched unless --purge-undecryptable is passed,
 * which removes cases whose facts were encrypted under a different
 * ENCRYPTION_KEY and can no longer be opened (they would crash the case page).
 *
 * Usage: npm run db:seed-sih [-- --purge-undecryptable] [-- --live-ai]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { computeCase } from "../src/lib/caseCompute";
import { buildCaseUpdateFromFacts } from "../src/lib/ai/applyExtraction";
import { extractFactsWithSelfCheck } from "../src/lib/ai/extraction";
import { draftWithFallback, templateDraft, type DraftInput } from "../src/lib/ai/drafting";
import { storeExtractedFacts } from "../src/lib/extractedFactStore";
import { decryptField } from "../src/lib/crypto";
import { SIH_CASES, buildCase, daysAgoAt } from "./seedData/sihCases";
import { DISTRICTS } from "./constants";

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const LIVE_AI = args.has("--live-ai");
const PURGE_UNDECRYPTABLE = args.has("--purge-undecryptable");

async function deleteCases(caseIds: string[]) {
  if (caseIds.length === 0) return;
  const personIds = (await prisma.case.findMany({ where: { id: { in: caseIds } }, select: { personId: true } })).map((c) => c.personId);
  await prisma.$transaction([
    prisma.extractedFact.deleteMany({ where: { caseId: { in: caseIds } } }),
    prisma.formulaResult.deleteMany({ where: { caseId: { in: caseIds } } }),
    prisma.trackBFlag.deleteMany({ where: { caseId: { in: caseIds } } }),
    prisma.application.deleteMany({ where: { caseId: { in: caseIds } } }),
    prisma.caseStatusEvent.deleteMany({ where: { caseId: { in: caseIds } } }),
    prisma.case.deleteMany({ where: { id: { in: caseIds } } }),
  ]);
  await prisma.person.deleteMany({ where: { id: { in: personIds }, cases: { none: {} } } });
}

async function findUndecryptableCaseIds(): Promise<string[]> {
  const facts = await prisma.extractedFact.findMany({ select: { caseId: true, value: true } });
  const broken = new Set<string>();
  for (const f of facts) {
    try {
      decryptField(f.value);
    } catch {
      broken.add(f.caseId);
    }
  }
  return [...broken];
}

async function main() {
  const now = new Date();

  if ((await prisma.knowledgeBaseSection.count()) === 0) {
    throw new Error('Knowledge base is empty — run "npm run db:seed" first.');
  }
  for (const d of DISTRICTS) {
    await prisma.district.upsert({ where: { id: d.id }, update: {}, create: { ...d } });
  }

  if (PURGE_UNDECRYPTABLE) {
    const broken = await findUndecryptableCaseIds();
    if (broken.length > 0) {
      const backup = await prisma.case.findMany({
        where: { id: { in: broken } },
        include: { person: true, extractedFacts: true, formulaResult: true, trackBFlag: true, applications: true, statusEvents: true },
      });
      mkdirSync(".backups", { recursive: true });
      const file = join(".backups", `undecryptable-cases-${now.toISOString().replace(/[:.]/g, "-")}.json`);
      writeFileSync(file, JSON.stringify(backup, null, 2));
      console.log(`Backed up ${broken.length} undecryptable case(s), ciphertext intact, to ${file}`);
    }
    await deleteCases(broken);
    console.log(`Purged ${broken.length} case(s) whose facts could not be decrypted with the current ENCRYPTION_KEY.`);
  }

  const owned = await prisma.case.findMany({ where: { fixtureKey: { startsWith: "sih-" } }, select: { id: true } });
  await deleteCases(owned.map((c) => c.id));
  if (owned.length) console.log(`Replaced ${owned.length} previously seeded SIH case(s).`);

  const useLiveAi = LIVE_AI && Boolean(process.env.NVIDIA_API_KEY);
  if (LIVE_AI && !useLiveAi) console.log("--live-ai ignored: NVIDIA_API_KEY is not set. Using pre-computed facts.");

  const summary = { tier1: 0, tier2: 0, notYet: 0, review: 0, excluded: 0, trackB: 0, mismatches: [] as string[] };

  for (const spec of SIH_CASES) {
    const built = buildCase(spec, now);

    const person = await prisma.person.create({ data: { nameVariants: [spec.name], approxAge: spec.age } });
    const dbCase = await prisma.case.create({
      data: {
        personId: person.id,
        districtId: spec.districtId,
        arrestDate: built.arrestDate,
        custodyStatus: spec.custody,
        isJuvenile: spec.isJuvenile ?? false,
        specialActFlag: spec.specialActFlag ?? false,
        pendingCaseFlag: "UNKNOWN",
        dataSource: "SYNTHETIC_CHARGE_SHEET",
        sourceDataset: "JuriSync synthetic charge sheet (fictional persons and FIRs)",
        sourceRef: spec.key,
        custodySource: "SIMULATED",
        fixtureKey: spec.key,
      },
    });

    const facts = useLiveAi ? await extractFactsWithSelfCheck(built.chargeSheetText) : built.facts;
    await storeExtractedFacts(
      facts.map((f) => ({
        caseId: dbCase.id,
        fieldName: f.fieldName,
        value: f.value,
        sourceSentence: f.sourceSentence,
        confidence: f.confidence,
        method: useLiveAi ? "AI_DOUBLE_PASS" : "PRECOMPUTED_FIXTURE",
      }))
    );
    const update = buildCaseUpdateFromFacts(facts);
    if (Object.keys(update).length > 0) {
      await prisma.case.update({ where: { id: dbCase.id }, data: update });
    }

    const result = await computeCase(dbCase.id);
    const fr = await prisma.formulaResult.findUnique({ where: { caseId: dbCase.id }, include: { governingSection: true } });
    const tb = await prisma.trackBFlag.findUnique({ where: { caseId: dbCase.id } });

    const drafts: DraftInput[] = [];
    if (fr?.tier) {
      drafts.push({
        type: "release",
        personName: spec.name,
        governingSectionCode: `${fr.governingSection.law} ${fr.governingSection.code}`,
        applicableFraction: fr.applicableFraction,
        thresholdDays: fr.thresholdDays,
        daysInCustody: fr.daysInCustody,
        overdueDays: fr.overdueDays ?? 0,
        tier: fr.tier === "TIER_1" ? 1 : 2,
      });
    }
    if (tb?.bailOrderDate && tb.daysSinceBail !== null) {
      drafts.push({ type: "surety", personName: spec.name, bailOrderDate: tb.bailOrderDate.toISOString().slice(0, 10), daysSinceBail: tb.daysSinceBail });
    }
    for (const input of drafts) {
      const drafted = useLiveAi ? await draftWithFallback(input) : { draftText: templateDraft(input), generator: "TEMPLATE" as const };
      await prisma.application.create({ data: { caseId: dbCase.id, type: input.type, draftText: drafted.draftText, generator: drafted.generator } });
    }

    for (const step of spec.history) {
      await prisma.caseStatusEvent.create({
        data: { caseId: dbCase.id, status: step.status, source: step.source, note: step.note, eventTime: daysAgoAt(step.daysAgo, now) },
      });
    }
    const last = spec.history.at(-1);
    await prisma.case.update({
      where: { id: dbCase.id },
      data: last
        ? { caseStatus: last.status, statusUpdatedAt: daysAgoAt(last.daysAgo, now), createdAt: daysAgoAt(spec.history[0].daysAgo, now) }
        : { statusUpdatedAt: now },
    });

    const exclusion = result.exclusion.status.toUpperCase();
    const tier = fr?.tier === "TIER_1" ? 1 : fr?.tier === "TIER_2" ? 2 : null;
    if (exclusion !== spec.expect.exclusion || tier !== spec.expect.tier || Boolean(tb && result.trackB.status === "flagged") !== spec.expect.trackB) {
      summary.mismatches.push(`${spec.key}: got ${exclusion}/tier ${tier}, expected ${spec.expect.exclusion}/tier ${spec.expect.tier}`);
    }
    if (exclusion === "EXCLUDED") summary.excluded++;
    else if (exclusion === "NEEDS_HUMAN_REVIEW") summary.review++;
    else if (tier === 1) summary.tier1++;
    else if (tier === 2) summary.tier2++;
    else summary.notYet++;
    if (tb) summary.trackB++;

    const label = tier ? `Tier ${tier}, ${fr!.overdueDays} days overdue` : exclusion === "CLEAR" ? (tb ? "Track B" : "not yet eligible") : exclusion;
    console.log(`  ${spec.key.padEnd(28)} ${spec.name.padEnd(26)} ${label}`);
  }

  await prisma.auditLog.create({
    data: { actorUserId: null, action: `seed_sih_dataset: ${SIH_CASES.length} synthetic cases (${useLiveAi ? "live AI" : "pre-computed facts"})`, entity: "System" },
  });

  console.log(
    `\nSeeded ${SIH_CASES.length} cases — Tier 1: ${summary.tier1}, Tier 2: ${summary.tier2}, not yet eligible: ${summary.notYet}, needs review: ${summary.review}, excluded: ${summary.excluded}, Track B: ${summary.trackB}.`
  );
  if (summary.mismatches.length) {
    console.error(`\nOutcome mismatches:\n  ${summary.mismatches.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
