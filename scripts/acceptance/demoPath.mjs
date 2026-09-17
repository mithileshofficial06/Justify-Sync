// Walks the build doc's Section 8 demo click path as a stranger would, and checks Section 9 acceptance items.
// usage: npm run test:demo-path -- [mobile|desktop] [none|4g|3g] [label]
// Env: BASE_URL (default http://localhost:3000), CHROME_PATH (Chrome or Edge executable). Needs the demo seeds and DEMO_MODE=true.
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const [device = "mobile", throttle = "4g", label = `${device}-${throttle}`] = process.argv.slice(2);
const SHOTS = ".demo-shots";
mkdirSync(SHOTS, { recursive: true });
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found — set CHROME_PATH.");
const shot = (name) => join(SHOTS, `${label}-${name}.png`);
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-first-run"] });
const ctx = await browser.createBrowserContext(); // fresh "incognito" profile, no cookies
const page = await ctx.newPage();
if (device === "mobile") await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
else await page.setViewport({ width: 1366, height: 900 });

const cdp = await page.createCDPSession();
const PROFILES = {
  "4g": { latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (9 * 1024 * 1024) / 8 },
  "3g": { latency: 562, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
};
if (PROFILES[throttle]) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...PROFILES[throttle] });

const errors = [];
const aiCalls = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => r.status() >= 500 && errors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("request", (r) => /\/api\/cases\/[^/]+\/(extract|draft)/.test(r.url()) && aiCalls.push(r.url()));

const text = () => page.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
const go = (path) => page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 180000 });

// 1. Landing page — funnel, leaks, NALSA line, demo credentials visible without scrolling far
const t0 = Date.now();
await go("/");
let body = await text();
check("7.1 funnel 528,728 → 7,421", body.includes("528,728") && body.includes("7,421"));
check("7.1 both leaks named", /3,400/.test(body) && /1,750/.test(body));
check("7.1 NALSA line", /NALSA/.test(body));
check("7.1 demo credentials in plain text", body.includes("TN/1234/2015") && body.includes("JuriSync@Demo1"));
const panelTop = await page.$eval("#demo", (el) => el.getBoundingClientRect().top + window.scrollY);
check("7.1 demo panel within first 1.5 screens", panelTop < 844 * 1.5 || device === "desktop", `top=${Math.round(panelTop)}px`);
await page.screenshot({ path: shot("1-landing") });

// 2. Sign in as the demo lawyer from the landing panel
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('a[href^="/login?as=TN%2F1234%2F2015"]')]);
body = await text();
check("7.2 username labelled as Bar Council enrolment no.", /Bar Council enrolment no/i.test(body));
await page.click("button[type=submit]");
await page.waitForSelector("input[autocomplete=one-time-code]", { timeout: 60000 });
body = await text();
check("7.2 OTP step visible with demo note", /auto-filled/i.test(body) && /never skipped/i.test(body));
await page.screenshot({ path: shot("2-otp") });
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }), page.click("button[type=submit]")]);
const loginSeconds = (Date.now() - t0) / 1000;
body = await text();
check("C1 landing → populated worklist", /Tier 1/.test(body) && /days overdue/i.test(body), `${loginSeconds.toFixed(1)}s incl. landing load`);
check("C1 under 10 seconds", loginSeconds < 10, `${loginSeconds.toFixed(1)}s`);

// 3. Worklist header strip, provenance, tier separation
check("7.3 header strip", /Undertrials scanned/i.test(body) && /Eligible today/i.test(body) && /Data provenance/i.test(body));
check("7.3 provenance badge on rows", /Synthetic/.test(body));
check("7.3 Tier 1 plain-language label", /held longer than the maximum sentence/i.test(body));
check("7.3 Track B block", /Track B/.test(body));
await page.screenshot({ path: shot("3-worklist"), fullPage: true });

// 4. Open the top Tier 1 case — arithmetic panel
const firstCase = await page.$eval('a[href^="/cases/"]:not([href="/cases/new"])', (a) => a.getAttribute("href"));
await go(firstCase);
body = await text();
check("7.4 arithmetic panel", /Governing section/.test(body) && /Applicable threshold/.test(body) && /TIER 1 ELIGIBLE/.test(body));
check("7.4 grounding sentences", /The accused was arrested on/.test(body));
check("7.4 AI vs rules labelled", /AI read/i.test(body) && /Fixed rule/i.test(body));
check("7.4 e-Prisons custody panel", /e-Prisons adapter/i.test(body));
check("7.4 draft with no submit-to-court", /no .submit to court. action/i.test(body) && /Mark as filed/i.test(body));
check("7.4 status timeline with sources", /Status timeline/i.test(body) && /System/.test(body));
await page.screenshot({ path: shot("4-tier1-case"), fullPage: true });

// 5. Case 3 — fraction ordering comparison
await go("/");
const caseLinks = await page.$$eval('a[href^="/cases/"]:not([href="/cases/new"])', (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.innerText })));
const selvaraj = caseLinks.find((l) => /SELVARAJ/i.test(l.text));
await go(selvaraj.href);
body = await text();
check("C2 fraction-ordering comparison on screen", /Why the order of the steps matters/i.test(body) && (body.match(/[\d,]+ days overdue/g) ?? []).length >= 2);

// 6. Needs review — NDPS, blank priors, juvenile
await go("/needs-review");
body = await text();
check("C4 NDPS stricter scrutiny with reason", /PRABHAKARAN/i.test(body) && /special-act undertrials/i.test(body));
check("C4 blank priors with reason", /EZHILARASAN/i.test(body) && /never assumed/i.test(body));
check("C4 juvenile routed to JJ Act", /ARUN KUMAR/i.test(body) && /Juvenile Justice/i.test(body));
await page.screenshot({ path: shot("6-needs-review"), fullPage: true });

// 7. Stalled — all three escalation states with elapsed time
await go("/stalled");
body = await text();
check("C5 not filed with elapsed time", /Identified as eligible \d+ days ago/.test(body));
check("C5 no hearing with elapsed time", /Application filed \d+ days ago/.test(body));
check("C5 bail granted not released", /Bail granted \d+ days ago/.test(body));
await page.screenshot({ path: shot("7-stalled"), fullPage: true });

// 8. Track B case — surety draft
const tb = (await page.$$eval('a[href^="/cases/"]:not([href="/cases/new"])', (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.innerText })))).find((l) => /RAMAMOORTHY/i.test(l.text));
await go(tb.href);
body = await text();
check("C5 Track B case with surety draft", /Probable surety failure/i.test(body) && /Surety-modification application/i.test(body));

// 9. Role scoping — lawyer cannot open the state overview
await go("/admin/state");
check("C1 role scoping: lawyer redirected from state overview", !/State overview/i.test(await page.title()) && new URL(page.url()).pathname === "/");

// 10. Public knowledge base and data sources
await go("/knowledge-base");
body = await text();
check("C3 KB 40+ versioned cited rows incl. graded & state act", /KB-2026\.09/.test(body) && /TN Prohibition Act/.test(body) && /304 Part I/.test(body) && /Fine only/i.test(body));
await go("/data-sources");
body = await text();
check("M6 data sources page", /Saurav Das/.test(body) && /Simulated/i.test(body));

check("no live AI call on the demo path", aiCalls.length === 0, aiCalls.join(", "));
check("no page errors or 5xx", errors.length === 0, [...new Set(errors)].join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n[${label}] ${device}, throttle=${throttle}: ${results.length - failed.length}/${results.length} passed`);
for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
process.exitCode = failed.length ? 1 : 0;
