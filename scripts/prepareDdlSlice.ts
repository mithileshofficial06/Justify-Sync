/**
 * Cuts one district out of the Development Data Lab judicial dataset (public
 * eCourts metadata, 2010–2018, CC BY-NC-SA 4.0 — https://www.devdatalab.org/judicial-data)
 * and writes the canonical slice CSV that data:load-ecourts reads.
 *
 * The DDL files are several GB, so everything is streamed line by line.
 *
 * Usage:
 *   npm run data:prepare-ddl -- \
 *     --cases path/to/cases_2018.csv --acts path/to/acts_sections.csv \
 *     --act-key path/to/act_key.csv --section-key path/to/section_key.csv \
 *     --state 33 --district 1 --snapshot 2018-12-31 --out data/chennai-2018.csv
 *
 * Column names follow the DDL release; every one can be overridden, e.g.
 * --col-filing date_of_filing. Check the header of your download first.
 */
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { parseCsv } from "../src/lib/courtData/slice";

const argv = process.argv.slice(2);
const arg = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`Missing --${name}`);
  return v;
};
const optional = (name: string) => (argv.includes(`--${name}`) ? arg(name) : undefined);

const COL = {
  id: arg("col-id", "ddl_case_id"),
  state: arg("col-state", "state_code"),
  district: arg("col-district", "dist_code"),
  filing: arg("col-filing", "date_of_filing"),
  decision: arg("col-decision", "date_of_decision"),
  act: arg("col-act", "act"),
  section: arg("col-section", "section"),
  criminal: arg("col-criminal", "criminal"),
  actName: arg("col-act-name", "act_s"),
  sectionName: arg("col-section-name", "section_s"),
};

async function* csvRecords(path: string) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const [fields] = parseCsv(line);
    if (!header) {
      header = fields.map((h) => h.trim().toLowerCase());
      continue;
    }
    yield Object.fromEntries(header.map((h, i) => [h, (fields[i] ?? "").trim()]));
  }
}

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main() {
  const state = arg("state");
  const district = arg("district");
  const snapshot = arg("snapshot");
  const out = arg("out");

  const actNames = new Map<string, string>();
  const actKey = optional("act-key");
  if (actKey) for await (const r of csvRecords(actKey)) actNames.set(r[COL.act], r[COL.actName]);

  const sectionNames = new Map<string, string>();
  const sectionKey = optional("section-key");
  if (sectionKey) for await (const r of csvRecords(sectionKey)) sectionNames.set(`${r[COL.act]}|${r[COL.section]}`, r[COL.sectionName]);

  const cases = new Map<string, { filing: string; decision: string }>();
  let scanned = 0;
  for await (const r of csvRecords(arg("cases"))) {
    scanned++;
    if (r[COL.state] === state && r[COL.district] === district) {
      cases.set(r[COL.id], { filing: r[COL.filing], decision: r[COL.decision] });
    }
  }
  console.log(`Scanned ${scanned.toLocaleString()} cases; ${cases.size.toLocaleString()} in state ${state}, district ${district}.`);

  mkdirSync(dirname(out), { recursive: true });
  const w = createWriteStream(out);
  w.write("case_ref,act,section,filing_date,decision_date,arrest_date,snapshot_date\n");
  let written = 0;
  for await (const r of csvRecords(arg("acts"))) {
    const c = cases.get(r[COL.id]);
    if (!c) continue;
    if (COL.criminal in r && r[COL.criminal] !== "1") continue;
    const act = actNames.get(r[COL.act]) ?? r[COL.act];
    const section = sectionNames.get(`${r[COL.act]}|${r[COL.section]}`) ?? r[COL.section];
    w.write([r[COL.id], act, section, c.filing, c.decision, "", snapshot].map(csvField).join(",") + "\n");
    written++;
  }
  await new Promise<void>((resolve) => w.end(resolve));
  console.log(`Wrote ${written.toLocaleString()} criminal act/section rows to ${out}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
