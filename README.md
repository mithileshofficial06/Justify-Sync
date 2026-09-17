# JuriSync

**JuriSync** finds undertrial prisoners in Indian district jails who have already served enough time in custody to be released under **Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)** — and gets a DLSA (District Legal Services Authority) lawyer to file for their release, with a human confirming every decision along the way.

Section 479 says an undertrial who has served half (or a third, for first‑time offenders) of the maximum sentence their charged offence carries is entitled to release on a personal bond. In practice, nobody is systematically checking custody duration against this rule across thousands of cases — so eligible prisoners stay in jail. JuriSync is that check, run daily, with AI doing the tedious document reading and a fixed, auditable formula — never the AI — doing the eligibility decision.

## The problem, in one paragraph

Charge sheets are unstructured text. Custody duration is arithmetic. The rule (§479 BNSS) is fixed and public. Nothing about *deciding* eligibility should require a human to page through a docket — but nothing about it should be left to an LLM's judgment either. JuriSync splits the work along that line: AI reads documents and drafts paperwork; a small set of pure, testable functions in [`src/lib/engine/`](src/lib/engine/) makes every eligibility call; a lawyer signs off before anything is filed.

## Features

### 1. Two-track eligibility engine (`src/lib/engine/`)
A dependency-free, unit-tested rules engine — no database, no AI calls, so every decision is reproducible and auditable in isolation.

- **Exclusions first** ([`exclusions.ts`](src/lib/engine/exclusions.ts)) — before any eligibility math runs, a case is checked against the statutory carve-outs: death/life-eligible offences, juveniles (routed to the Juvenile Justice Act instead), confirmed multiple pending cases, and special acts (NDPS/UAPA/PMLA/POCSO/MCOCA). Special-act cases are flagged for **stricter scrutiny**, never silently excluded — courts have applied §479 to those cases too. Anything the engine can't confidently resolve (unclear prior-conviction status, an unresolved "other pending cases" match) is routed to **needs human review**, never guessed.
- **Track A — fixed-formula eligibility** ([`threshold.ts`](src/lib/engine/threshold.ts), [`governingSection.ts`](src/lib/engine/governingSection.ts), [`custody.ts`](src/lib/engine/custody.ts)) — computes the governing section (the charged section with the highest maximum sentence), the applicable fraction (1/3 for a first-time offender, 1/2 otherwise), the day threshold, and classifies the case as **Tier 1** (has served the *full* maximum sentence — the most urgent cohort) or **Tier 2** (has crossed the statutory threshold).
- **Track B — surety-failure detection** ([`trackB.ts`](src/lib/engine/trackB.ts)) — flags a separate, simpler failure mode: bail was *granted* but the person is still in custody 7+ days later, almost always because they can't furnish the surety. Needs no sentencing law at all.
- **Ranking** ([`rank.ts`](src/lib/engine/rank.ts)) — Tier 1 always outranks Tier 2; within a tier, most-overdue-first, so the lawyer's worklist surfaces the most urgent cases at the top.
- **Escalation** ([`escalation.ts`](src/lib/engine/escalation.ts)) — a case with no status movement for 30+ days after identification, 60+ days after filing, or 7+ days after bail is granted gets escalated regardless of who was supposed to act.

### 2. AI document extraction — grounded, self-checked (`src/lib/ai/extraction.ts`)
Reads a charge sheet and pulls out five fields (arrest date, charged sections, prior convictions, other pending cases, bail order) using an LLM (NVIDIA NIM, OpenAI-compatible API) — but never lets the model's output stand on its own:
- **Grounding**: every extracted fact must carry the *exact source sentence* it came from; a fact whose quote doesn't literally appear in the document, or is a truncated fragment of a longer sentence, is discarded.
- **Hedge detection**: a sentence like *"no conviction on record; however, verification is still awaited"* is rejected even if the model still confidently outputs `true`/`false` for it — a regex catches hedging language (`however`, `awaited`, `not yet`, etc.) inside the grounding sentence and throws the fact out regardless of what value the model assigned.
- **Self-check via double extraction**: every document is extracted **twice**, in parallel. Facts both passes agree on are marked high confidence (0.9); facts that disagree or appear in only one pass are kept at low confidence (0.4) and routed to human review rather than silently trusted.

### 3. AI drafting — proposal only, never the decision (`src/lib/ai/drafting.ts`)
Drafts a formal §479 BNSS release application or a surety-modification application from the exact facts the engine already computed — it is explicitly instructed never to invent a fact. There is no "submit to court" action anywhere in the app, only "mark as filed": a human lawyer must always take the paperwork out of the system and file it themselves.

### 4. Entity resolution (`src/lib/entityResolution.ts`)
The same person can appear differently across FIRs — different name transliteration, no shared person-level ID. A Jaro-Winkler name-similarity implementation (plus an age-proximity check) surfaces **candidate** matches for a human to confirm whether an accused has other pending cases — it never auto-confirms a match itself; that stays a `manual override` decision.

### 5. Role-based auth with district scoping (`src/lib/auth/`, `src/app/api/auth/`)
- Password + mandatory OTP two-step login (`/api/auth/login` → `/api/auth/verify-otp`), Argon2 password hashing, 5-failed-attempt / 15-minute account lockout.
- Short-lived (15 min) JWT access tokens + 30-day refresh tokens, both scoped with `role` and `districtId` so every API call is automatically restricted to the caller's own district (except `STATE_ADMIN`, which sees everything).
- Four roles: `LAWYER`, `DISTRICT_ADMIN`, `STATE_ADMIN`, `REVIEWER`.
- New lawyer registrations start `PENDING_VERIFICATION` and require a District Admin to approve or reject them (`/admin`) before they can log in — approval/rejection triggers a real email notification.
- Forgot-password / reset-password flow with hashed, time-limited reset tokens.

### 6. Field-level encryption at rest (`src/lib/crypto.ts`, `src/lib/extractedFactStore.ts`)
Every extracted personal fact (`ExtractedFact.value` and `.sourceSentence` — name matches, prior-conviction status, etc.) is encrypted with AES‑256‑GCM before it touches the database, and only ever decrypted server-side when a lawyer views a case. All reads/writes are centralized through one store module so encryption can't be accidentally bypassed at any of the several call sites (extraction, manual override, demo seeding).

### 7. Dashboards, by role
- **Ranked list** (`/`) — the day's worklist: Track A cases ranked by tier/overdue-days, Track B surety flags, for the logged-in lawyer's district.
- **Needs review** (`/needs-review`) — cases the engine couldn't confidently resolve (`EXCLUDED` / `NEEDS_HUMAN_REVIEW`) — previously invisible anywhere in the app.
- **Stalled** (`/stalled`) — cases the daily escalation sweep has flagged for no status movement.
- **Case detail** (`/cases/[id]`) — full case view: extracted facts (decrypted), formula result, Track B flag, potential entity-resolution matches, generated applications, status history, manual override form, and case actions (recompute, draft application, advance status).
- **New case** (`/cases/new`) — create a case, paste a charge sheet, run extraction.
- **District Admin — Approvals** (`/admin`) — approve/reject pending lawyer registrations for their district.
- **State Admin — State overview** (`/admin/state`) — aggregated per-district stats: cases tracked, Tier 1/2 counts, Track B flags, filing rate, release rate, cases needing review.
- **Public showcase / registration** (`/`, `/register`) — landing page (Framer Motion animated) and self-service registration for new lawyers when logged out.

### 8. Notifications (`src/lib/notifications/email.ts`)
Real email delivery via Resend (not a stub) for: lawyer approval/rejection, and the daily escalation digest (one email per district, to that district's active admins). Notification bodies always carry a summary, never the underlying case content.

### 9. Scheduled jobs (`src/app/api/jobs/`, `vercel.json`)
Two cron-triggered HTTP endpoints, protected by a shared `CRON_SECRET` bearer token (not a lawyer session), scheduled via Vercel Cron:
- **Daily sweep** (`/api/jobs/daily-sweep`, 3 AM daily) — runs escalation checks across every non-released case and emails each district's admins a digest of stalled cases.
- **Data retention purge** (`/api/jobs/data-retention`, 4 AM weekly) — for cases released more than 3 years ago, deletes their `ExtractedFact` rows and anonymizes the linked `Person` record, while deliberately keeping the `Case`/`FormulaResult`/`CaseStatusEvent` rows so aggregate accountability statistics keep working without referencing anything personally identifying.

### 10. Audit trail (`src/lib/audit.ts`)
Every login (success/failure/lockout), case view, approval decision, override, and system job run is written to an `AuditLog` table — reads are logged, not just writes, since unnecessary viewing of sensitive undertrial data is itself a risk worth tracking.

## How it works end to end

```
 Charge sheet text
        │
        ▼
 AI extraction (2 parallel passes, grounded + hedge-checked)  ──▶  ExtractedFact rows (encrypted at rest)
        │
        ▼
 computeCase()  ── the only place the pure engine touches the DB
   ├─ checkExclusions()        → CLEAR / STRICTER_SCRUTINY / NEEDS_HUMAN_REVIEW / EXCLUDED
   ├─ Track A: classifyTier()  → Tier 1 / Tier 2 / not yet eligible   (only if not excluded)
   └─ Track B: checkSuretyFailure() → flagged / clear / data-quality review   (always runs)
        │
        ▼
 Ranked worklist (rankCases)  ──▶  lawyer opens a case
        │
        ▼
 draftApplication()  → AI drafts a §479 BNSS release / surety application from the computed facts only
        │
        ▼
 Lawyer reviews, edits, files outside the system, then marks the case "filed" → "heard" → "bail granted" → "released"
        │
        ▼
 Daily sweep escalates anything stuck too long at any stage → district admin email digest
```

Everything above the "Ranked worklist" line is either a pure function (`src/lib/engine/`) or a grounding/self-check layer around an LLM call (`src/lib/ai/`) — the two are never allowed to import from each other, so the eligibility decision can never quietly depend on what the AI thinks.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Components) |
| Language | TypeScript |
| Database | PostgreSQL via [Supabase](https://supabase.com), [Prisma ORM](https://www.prisma.io) |
| Auth | Argon2 password hashing, [`jose`](https://github.com/panva/jose) JWTs, OTP two-step login |
| AI | NVIDIA NIM (OpenAI-compatible API), `nemotron-3-nano-30b-a3b` |
| Validation | [Zod](https://zod.dev) |
| Email | [Resend](https://resend.com) |
| Encryption | Node `crypto`, AES-256-GCM |
| Styling | Tailwind CSS v4, Framer Motion |
| Testing | [Vitest](https://vitest.dev) |
| Scheduling | Vercel Cron |

## Data model

Defined in [`prisma/schema.prisma`](prisma/schema.prisma):

- `User` / `District` — DLSA lawyers and admins, scoped to a district.
- `Person` — an accused, with name variants for entity resolution across records.
- `Case` — one prosecution: charged sections, custody status, bail status, exclusion status, case status.
- `KnowledgeBaseSection` — the statutory knowledge base (IPC/BNS/special-act sections with max sentence, whether death/life-eligible).
- `ExtractedFact` — AI-extracted, human-overridable, encrypted-at-rest facts, each with a grounding source sentence and confidence.
- `FormulaResult` — Track A's computed tier/threshold/overdue days for a case.
- `TrackBFlag` — Track B's surety-failure flag for a case.
- `Application` — AI-drafted filing text.
- `CaseStatusEvent` — full status history (system/eCourts/lawyer-sourced).
- `AuditLog` — every sensitive action, who did it, when.

## Getting started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) Postgres project (or any Postgres instance)
- Optional: an NVIDIA NIM API key ([free tier](https://build.nvidia.com)) for live extraction/drafting — without it, drafts use deterministic templates and the demo data uses pre-computed readings
- Optional: a [Resend](https://resend.com) API key for email — without it, emails are logged instead of sent

### Setup

```bash
git clone https://github.com/mithileshofficial06/Justify-Sync.git
cd Justify-Sync
npm install
cp .env.example .env            # fill in the values — see comments in the file for gotchas
npx prisma db push              # create the tables
npm run db:seed                 # districts + statutory knowledge base (KB-2026.09)
npm run db:seed-demo-accounts   # three demo logins + two pending lawyer registrations
npm run db:seed-sih             # the demo dataset, run through the real engine
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `DEMO_MODE="true"` the landing page shows the demo sign-in panel.

### Evaluating JuriSync (demo accounts)

| Role | Username (Bar Council no.) | Password | Sees |
|---|---|---|---|
| DLSA Lawyer | `TN/1234/2015` | `JuriSync@Demo1` | Chennai ranked worklist, case files, drafts |
| District Admin | `TN/5678/2009` | `JuriSync@Demo2` | Chennai worklist + pending lawyer approvals |
| State Admin | `TN/9012/2004` | `JuriSync@Demo3` | Per-district funnel across Tamil Nadu |

The OTP step is never skipped. While `DEMO_MODE` is on, it is auto-filled for these three accounts only, and they cannot be locked out. Every other account gets a random OTP by SMS and the normal lockout. See [docs/SIH_DEMO.md](docs/SIH_DEMO.md) for the click path and acceptance results.

### Loading real court metadata

```bash
# 1. Cut one district out of the Development Data Lab judicial dataset (public eCourts metadata)
npm run data:prepare-ddl -- --cases cases_2018.csv --acts acts_sections.csv \
  --act-key act_key.csv --section-key section_key.csv --state <code> --district <code> \
  --snapshot 2018-12-31 --out data/slice.csv

# 2. Load it and run the engine over every case
npm run data:load-ecourts -- --file data/slice.csv --dataset "DDL Judicial Data 2018" [--priors synthetic-none]
```

The loader prints loaded/skipped counts and which sections blocked the most cases. Custody is counted to the dataset's snapshot date, never to today. Court metadata has no prior-conviction field, so those cases go to review unless `--priors synthetic-none` records a clearly labelled synthetic value.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / start |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest suite (engine, explainability, knowledge base, seed dataset, court data, AI grounding, crypto, entity resolution) |
| `npm run db:seed` | Districts + statutory knowledge base |
| `npm run db:seed-demo-accounts` | Demo Lawyer / District Admin / State Admin accounts and pending registrations |
| `npm run db:seed-sih` (alias `db:seed-demo`) | Demo dataset through the real pipeline; add `-- --live-ai` to use the model, `-- --purge-undecryptable` to back up and remove cases encrypted under a lost key |
| `npm run db:bootstrap-admin` | Create a real first District Admin from `BOOTSTRAP_ADMIN_*` env vars |
| `npm run data:prepare-ddl` | Extract a district slice from the DDL judicial dataset |
| `npm run data:load-ecourts` | Load a court-metadata slice and compute every case |
| `npm run test:demo-path` | Walk the demo click path in a headless browser against a running server |

## Security notes

- The eligibility engine (`src/lib/engine/`) has zero dependency on the AI client — an eligibility decision can never be silently influenced by an LLM.
- `ENCRYPTION_KEY` is load-bearing for reading previously-stored data — treat it like a database credential, never rotate it casually (see `.env.example`).
- Cron endpoints require a `CRON_SECRET` bearer token, not a user session. They accept GET (what Vercel Cron sends) and POST.
- `DEMO_MODE` only affects the three seeded demo accounts. Turn it off for any deployment holding real data.
- Every session JWT is scoped to a `role` and `districtId`; district-scoped queries filter on it server-side, not just in the UI.

## Project structure

```
src/
  app/                 Next.js App Router — pages + API routes
    api/
      auth/            login, OTP verification, refresh, register, forgot/reset password
      cases/           CRUD, compute, draft, status, extract, manual override
      admin/           lawyer approval, pending-lawyers list
      jobs/            daily-sweep, data-retention (cron)
  components/          React components (dashboard, case actions, showcase, nav)
  lib/
    engine/            Pure eligibility rules and the explain step — no DB, no AI, unit-tested
    ai/                LLM client, grounded extraction, drafting, draft templates
    auth/              Password hashing, JWT, OTP, session helpers
    courtData/         Court-metadata slice parsing and mapping
    jobs/              Daily sweep (recompute, identify, escalate, digest)
    queries/           District-scoped read models for each dashboard
    demo.ts            Demo accounts, gated by DEMO_MODE
    crypto.ts           AES-256-GCM field encryption
    extractedFactStore.ts  Centralized encrypted read/write for extracted facts
    entityResolution.ts     Jaro-Winkler name matching
    caseCompute.ts      Wires the pure engine to the database
    audit.ts            Audit log writer
    notifications/      Email delivery
prisma/
  schema.prisma        Data model (applied with prisma db push)
  seedData/            Knowledge base (sections.ts) and demo dataset (sihCases.ts), both tested
  seed.ts, seedDemoAccounts.ts, seedSih.ts, loadCourtData.ts, bootstrapAdmin.ts
scripts/
  prepareDdlSlice.ts   Streams a district out of the DDL dataset
  acceptance/          Headless demo click-path check
docs/
  SIH_DEMO.md          Demo click path, acceptance results, remaining manual steps
```
