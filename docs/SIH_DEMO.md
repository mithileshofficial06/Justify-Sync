# JuriSync — SIH demo guide

How the SIH build workflow (Modules 0–7) maps to this repository, the demo click path, and the acceptance results.

## Before the demo

```bash
npx prisma db push
npm run db:seed                 # districts + knowledge base KB-2026.09
npm run db:seed-demo-accounts   # demo logins; resets pending registrations
npm run db:seed-sih             # re-seed the morning of the demo so day counts match the script below
npm run build && npm run start
BASE_URL=http://localhost:3000 npm run test:demo-path -- mobile 4g
BASE_URL=http://localhost:3000 npm run test:demo-path -- desktop 4g
```

On the deployed site, set `DEMO_MODE=true`, `CRON_SECRET`, and the same `ENCRYPTION_KEY` the database was seeded with. A different key makes every stored fact unreadable.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| DLSA Lawyer | `TN/1234/2015` | `JuriSync@Demo1` |
| District Admin | `TN/5678/2009` | `JuriSync@Demo2` |
| State Admin | `TN/9012/2004` | `JuriSync@Demo3` |

## Click path (build doc Section 8)

Day counts are as on the day `db:seed-sih` runs.

1. **Landing** — funnel 528,728 → 7,421 released, both leaks, NALSA line. *(C3, C5)*
2. **Sign in as DLSA Lawyer** from the landing panel. The username is the Bar Council number; the OTP step shows and is auto-filled. *(C1)*
3. **Ranked list** — Chennai, Tier 1 at the top: Muthu Krishnan, 835 days overdue. Point at the provenance line and the "Synthetic" / "Custody sim." badges. *(C2, C3)*
4. **Open Muthu Krishnan** — read the arithmetic aloud: IPC 379, 3 years = 1,095 days, 1/3, threshold 365, 1,200 ≥ 365. *(C2)*
5. **Scroll to the facts** — every value quotes its sentence; AI-read panels have a dashed blue edge, rule panels a solid one. *(C2)*
6. **Open Selvaraj Arumugam** — 548 days overdue correctly vs 122 under the wrong ordering. *(C2)*
7. **Needs review** — Prabhakaran Sundaram (NDPS 21(b)) ranked under stricter scrutiny; Ezhilarasan (priors hedged); Arun Kumar S. (juvenile → JJ Act). *(C4)*
8. **Stalled** — Balamurugan (identified 45 days, never filed), Gopinath (filed 75 days, no hearing), Ramamoorthy (bail 14 days, still inside). "View today's digest email" shows what the District Admin receives. *(C5)*
9. **Ramamoorthy Ganesan** — Track B arithmetic and the drafted surety-modification application. *(C5)*
10. Close with the v4 §11 pitch line.

Extra cases for questions: Karthikeyan Murugesan (the v4 §3 worked example: 1,140 ≥ 852, 288 days), Murali Dharan (§304 part not established → review), Dhanush Raj (§392 conservative 14-year maximum), Mohd. Irfan / Mohammad Irfan (same-person match, human confirms), Senthil Kumar Ganapathy (fine-only IPC 290), Pandiyan Muthuvel (TN Prohibition Act). Sign in as State Admin for the per-district funnel, or as District Admin to approve a pending lawyer.

## Module status

| Module | Status | Where |
|---|---|---|
| M0 Pre-flight | Done — DB seeded, KB 92 rows, cron verified via GET, build + 191 tests green, lint clean | — |
| M1 Judge access | Done | `src/lib/demo.ts`, `LoginForm.tsx`, `Showcase.tsx`, `prisma/seedDemoAccounts.ts` |
| M2 Knowledge base | Done — 92 cited rows, version KB-2026.09, `/knowledge-base` | `prisma/seedData/sections.ts` |
| M3 Real court data | **Pipeline done; real slice not yet loaded** | `scripts/prepareDdlSlice.ts`, `prisma/loadCourtData.ts` |
| M4 Explainability | Done | `src/components/case/ArithmeticPanel.tsx`, `src/lib/engine/explain.ts` |
| M5 Execution gap | Done — stalled view, digest preview, state funnel | `src/app/stalled`, `src/app/admin/state` |
| M6 Provenance | Done — badges, `/data-sources`, e-Prisons panel, categorised needs-review | `src/components/case/Provenance.tsx` |
| M7 Hardening | Done except the offline recording | `scripts/acceptance/demoPath.mjs` |

## Acceptance checklist (build doc Section 9)

Automated by `npm run test:demo-path`. Last run on a production build: 32/32 checks, twice on mobile (390 px) and twice on desktop with 4G throttling, and once on slow 3G.

| Claim | Test | Result |
|---|---|---|
| C1 | Stranger reaches a populated dashboard from the landing page on a phone in under 10 s | Pass — 4.7–5.2 s on 4G, 8.4 s on slow 3G |
| C1 | OTP step visible; role scoping restricts what each account sees | Pass |
| C2 | Eligibility reproducible with a calculator from the case page alone | Pass |
| C2 | Fraction-ordering comparison visible on screen | Pass |
| C3 | Worklist contains real eCourts-sourced cases with provenance badges | **Open — load a real DDL slice** |
| C3 | Knowledge base page shows 40+ versioned, cited sections incl. graded and state act | Pass |
| C4 | Needs-review has NDPS, blank-priors and juvenile examples with reasons | Pass |
| C5 | Stalled view shows all three escalation states with elapsed time and trigger | Pass |
| C5 | State dashboard renders a per-district funnel | Pass |
| — | No live LLM call on the demo path | Pass |
| — | `npm run build` passes and Vitest is green | Pass |
| — | Screen recording of the click path exists as an offline fallback | **Open — record it** |

## Still to do by hand

1. **Real court data (C3).** Download the Development Data Lab judicial data (https://www.devdatalab.org/judicial-data, CC BY-NC-SA 4.0), check the column names in your copy against the defaults in `scripts/prepareDdlSlice.ts`, then run `data:prepare-ddl` and `data:load-ecourts` for Chennai. Record the loaded and skipped counts it prints — they are quotable. Until then, the data-sources page states that no real slice is loaded.
2. **Offline recording.** Screen-record the click path above on a phone and on a laptop.
3. **Verify two sourced claims** before presenting: the NALSA line on the landing page (taken from the build document) and the TN Prohibition Act §4(1)(a) maximum (sources disagreed, so the knowledge base uses the conservative 5 years and flags it for verification).
4. **Freeze the code** after the final deploy.
