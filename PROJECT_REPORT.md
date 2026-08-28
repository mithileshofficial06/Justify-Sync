# Justify-Sync — Project Report

## 1. Abstract

Justify-Sync is a web application that identifies undertrial prisoners in Indian district jails who are eligible for release under **Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)**, and helps District Legal Services Authority (DLSA) lawyers act on that eligibility — from AI-assisted document reading through to a drafted court application, with a human confirming every consequential decision. It is built as a full-stack Next.js application backed by PostgreSQL (Supabase), with a strict architectural separation between a deterministic, unit-tested eligibility engine and an AI layer used only for document extraction and drafting.

## 2. Problem statement

Section 479 BNSS entitles an undertrial who has served a defined fraction of the maximum possible sentence for their charged offence — one-third if they have no prior conviction, one-half otherwise — to release on a personal bond. The rule is simple arithmetic once the relevant facts (arrest date, charged section, prior-conviction status) are known. In practice those facts live in unstructured charge-sheet text, custody duration must be checked case-by-case against a statutory knowledge base, and nobody is doing this systematically across the case backload of a district — so eligible prisoners remain in custody past the point the law entitles them to release.

The system has to solve two different kinds of problem at once:
1. **An information-extraction problem** — reading free-text legal documents to recover a handful of structured facts, reliably enough to act on.
2. **A decision problem** — applying a fixed statutory rule correctly and consistently, with no tolerance for a wrong answer being silently produced by a probabilistic model.

Justify-Sync's central design decision is to never let the same component do both.

## 3. Objectives

- Automatically compute §479 BNSS eligibility for every case in a district, ranked by urgency.
- Extract the facts that eligibility depends on from charge-sheet text, with enough verification that a human can trust — or specifically distrust — each extracted fact.
- Never let an AI model's output determine eligibility directly; keep that decision in a small, pure, testable rules engine.
- Draft the legal paperwork an eligible case needs, without inventing any fact not already computed.
- Keep a human lawyer as the mandatory final decision-maker before anything is filed with a court.
- Scope every action to the correct district and role, with encryption of extracted personal data at rest and a full audit trail.
- Surface cases the system *can't* confidently resolve, rather than letting them silently disappear — and escalate cases that stall regardless of who was responsible for moving them.

## 4. System architecture

### 4.1 High-level flow

```
Charge sheet text
   │
   ▼
AI extraction (src/lib/ai/extraction.ts)
   — 2 parallel passes, each grounded to an exact source sentence,
     hedge-language filtered, cross-checked against each other
   │
   ▼
ExtractedFact rows — AES-256-GCM encrypted at rest (src/lib/crypto.ts)
   │
   ▼
computeCase() (src/lib/caseCompute.ts)
   — the ONLY point where the pure engine touches the database
   │
   ├─ checkExclusions()   → CLEAR / STRICTER_SCRUTINY / NEEDS_HUMAN_REVIEW / EXCLUDED
   ├─ Track A: classifyTier()  → Tier 1 / Tier 2 / not yet eligible  (skipped if excluded)
   └─ Track B: checkSuretyFailure()  → flagged / clear / data-quality review  (always runs)
   │
   ▼
Ranked worklist (rankCases) — district-scoped, role-scoped
   │
   ▼
Lawyer opens case → reviews extracted facts + entity-resolution matches →
   optionally manual-overrides a fact → recomputes →
   requests an AI-drafted application (src/lib/ai/drafting.ts) →
   reviews/edits it → files outside the system → marks status
   │
   ▼
Daily cron sweep (src/app/api/jobs/daily-sweep) → escalates stalled cases →
   emails district admins a digest
```

### 4.2 The engine/AI separation

`src/lib/engine/` contains only pure functions: no database import, no HTTP call, no AI client import. Every function takes plain data in and returns plain data out (`exclusions.ts`, `threshold.ts`, `governingSection.ts`, `custody.ts`, `trackB.ts`, `rank.ts`, `escalation.ts`), which is what makes each of them independently unit-testable and auditable — an eligibility outcome can be explained purely by pointing at the function and its inputs, with nothing probabilistic in between.

`src/lib/ai/client.ts` explicitly documents that its module must never be imported by anything under `lib/engine/`. The AI layer's two jobs — extraction and drafting — are kept downstream and upstream of the engine respectively, never inside it:
- **Downstream of nothing / upstream of the engine**: extraction produces `ExtractedFact` rows, which `computeCase()` reads as *input*.
- **Downstream of the engine**: drafting takes the engine's *output* (tier, threshold, overdue days) and turns it into prose — it cannot affect the tier itself.

### 4.3 Request/data flow for a single case

1. A lawyer creates a case (`POST /api/cases`) and pastes charge-sheet text.
2. `POST /api/cases/[id]/extract` runs `extractFactsWithSelfCheck()`, which issues two parallel LLM calls and keeps facts both agree on at high confidence, disagreements at low confidence — nothing is silently dropped, low-confidence facts just don't feed Track A until resolved.
3. `POST /api/cases/[id]/compute` runs `computeCase()`, which pulls the case, its charged sections, and the latest high-confidence `priorConvictions` fact, runs exclusions, then Track A and Track B, and persists `FormulaResult`/`TrackBFlag`.
4. The case appears on the ranked worklist (`/`), the needs-review queue (`/needs-review`), or the Track B list, depending on outcome.
5. `POST /api/cases/[id]/draft` calls `draftApplication()` with only the already-computed numbers, producing a `Application` row containing draft text.
6. The lawyer marks status via `POST /api/cases/[id]/status` as the case moves through the real-world pipeline (filed → heard → bail granted → released); each transition is a `CaseStatusEvent`.
7. The cron sweep periodically checks every non-released case against `checkEscalation()` and emails a digest to that district's admins for anything stalled.

## 5. Feature breakdown and how each works

### 5.1 Authentication and authorization
- **Registration**: a lawyer registers with their Bar Council enrolment number, district, and contact details; the account starts `PENDING_VERIFICATION`.
- **Approval**: a District Admin reviews pending registrations (`/admin`) and approves or rejects them against their own offline knowledge of the DLSA panel; the decision is emailed to the applicant and logged.
- **Login**: two-step — password verification (`Argon2`) followed by a 6-digit OTP sent to the lawyer's mobile (SMS via Twilio when configured; logs to the console in dev otherwise). 5 consecutive failed password attempts locks the account for 15 minutes.
- **Session**: on successful OTP verification, a 15-minute JWT access token and a 30-day JWT refresh token are issued (`jose`, HS256), both carrying `role` and `districtId` as claims. A background silent-refresh component (`SessionKeepAlive.tsx`) keeps the session alive without forcing a re-login every 15 minutes.
- **Scoping**: every case query filters by `districtId` from the session claims unless the caller is `STATE_ADMIN`, which is enforced server-side in the query layer (`src/lib/queries/`), not just hidden in the UI.

### 5.2 Two-track eligibility engine
- **Exclusions** run first and are the only place a case can be fully removed from consideration or routed to mandatory human review. The ordering matters: an *unknown* prior-conviction or *unknown* pending-case status is routed to review, never defaulted to the more lenient interpretation.
- **Track A (fixed formula)**:
  - The *governing section* is the charged section with the highest maximum sentence (a fixed rule — not chosen by AI).
  - The *applicable fraction* is chosen from conviction history **before** the day-threshold is computed, not after — computing tiers in the wrong order would compare a first-time offender's custody days against the wrong (stricter) threshold.
  - `thresholdDays = ceil(maxSentenceDays × fraction)` — rounded up, matching the specification's own worked example (325 IPC → 2,555 days max → 1/3 → 852-day threshold, not 851).
  - **Tier 1**: custody days ≥ the section's full maximum sentence (the accused has served the entire possible sentence for the offence). **Tier 2**: custody days ≥ the threshold but below the max. Both report `overdueDays` measured against the *threshold*, so Tier 1 and Tier 2 cases are ranked on a consistent scale.
- **Track B (surety failure)**: independent of sentencing law entirely — a case where bail was granted but the person is still in custody 7+ days later is flagged. A bail-granted case with no linked order date is treated as a **data-quality problem** requiring review, not silently treated as "no bail."
- **Ranking**: Tier 1 before Tier 2, most overdue first within a tier — this is what makes the homepage a genuine worklist rather than an unordered case list.
- **Escalation**: independent of the eligibility computation — tracks whether a *human* has moved a case forward in a reasonable time (30 days to file after identification, 60 days to a hearing after filing, 7 days to release after bail is granted), and escalates regardless of formula outcome.

### 5.3 AI extraction
Implemented with two defenses against the two failure modes observed during development (documented directly in `extraction.ts`'s comments, both confirmed against live model output, not hypothetical):
1. **Fabricated grounding** — the model can quote a sentence that either doesn't literally exist in the document, or is a truncated prefix of a longer sentence whose remainder (a "however", a semicolon-joined clause) changes its meaning. `quotesFullSentence()` rejects any quote that doesn't end in sentence-ending punctuation *and* is immediately followed by continuation language in the source document.
2. **Self-contradicting confidence** — the model can quote a genuinely complete, real sentence and still assign a confident `true`/`false` that its own quoted text hedges (e.g., "...no conviction on record; however, a verification report is still awaited"). A hedge-word regex (`however`, `awaited`, `not yet`, `unconfirmed`, etc.) applied to the grounding sentence rejects the fact regardless of the value the model assigned. (One hedge word, "pending," was deliberately removed from this list after it produced a real false positive against the standard charge-sheet phrase "no other case is presently pending" — the fix is documented in the source as a concrete example of why word-level hedge matching needs care.)

Every document is extracted **twice** and cross-checked; only facts both passes independently agree on are treated as high-confidence input to Track A.

### 5.4 AI drafting
Takes only the numbers Track A/B already computed (governing section, fraction, threshold, days in custody, overdue days, tier — or bail date and days-since-bail for Track B) and turns them into a formal application addressed to the court, explicitly instructed not to add any fact beyond what's given. There is no code path anywhere in the application that submits a filing to a court automatically — the only status transition available is "mark as filed," which a human performs after taking the draft out of the system.

### 5.5 Entity resolution
Detects when the same accused may appear under multiple cases/FIRs with inconsistent name spelling. Uses a from-scratch Jaro-Winkler string-similarity implementation (Jaro distance plus a common-prefix boost, tuned for transliteration variants like "Mohd"/"Mohammed"/"Muhammad") combined with an age-proximity filter (±3 years). Matches above a similarity threshold (0.82) are surfaced as **candidates only** on the case-detail page — the system never auto-confirms a multi-case match; a lawyer must explicitly confirm it via manual override, which is what actually triggers the `CONFIRMED_MULTI` exclusion.

### 5.6 Manual override
Where the AI pipeline can't confidently resolve a required fact — verified during development to genuinely happen, e.g. two extraction passes disagreeing on which section was charged — a lawyer can directly assert facts (charged sections, prior-conviction status, pending-case flag, juvenile status, special-act flag) through a form on the case page. A manually-asserted `priorConvictions` value is stored the same way an AI-extracted one is (as an `ExtractedFact`, at confidence 1.0, with an explicit "manually confirmed" source sentence) rather than as a special-cased field, so it flows through the exact same `computeCase()` logic with no branching.

### 5.7 Field-level encryption
`ExtractedFact.value` and `.sourceSentence` — the fields that actually carry personal information (name matches, prior-conviction status, source text quoting the case) — are encrypted with AES-256-GCM before being written to Postgres, keyed from `ENCRYPTION_KEY` (SHA-256-derived, so any string works as the deployer's key without needing an exact byte length). All reads and writes go through a single module (`extractedFactStore.ts`) specifically so encryption can never be silently skipped by a new call site.

### 5.8 Data retention
A weekly cron job purges the personally-identifying data of cases that have been `RELEASED` for more than three years: it deletes their `ExtractedFact` rows outright and anonymizes the linked `Person` row (name variants replaced with a `[purged]` sentinel, age and fuzzy-match cluster cleared). It deliberately leaves the `Case`, `FormulaResult`, and `CaseStatusEvent` rows in place, since those no longer reference anything personally identifying once `Person` is anonymized, and the state-level accountability dashboard depends on them for aggregate statistics (total cases tracked, filing rate, release rate) that must keep working after purge.

### 5.9 Notifications and escalation
Real email delivery (Resend) fires on two events: a lawyer's registration being approved/rejected, and the daily sweep's escalation digest. Digests are grouped per district and sent only to that district's active admins; the email body is always a short reason string, never underlying case content, consistent with the data-minimization stance the encryption and retention design also take.

### 5.10 Audit logging
Every login attempt (success, unknown user, wrong password, lockout), case view, approval/rejection decision, manual override, and scheduled job run is written to `AuditLog` with actor, action, entity, entity ID, IP address, and timestamp. Read access is logged as deliberately as write access — viewing sensitive undertrial data is treated as an event worth tracking, not just modifying it.

## 6. Technology stack

| Concern | Technology | Rationale |
|---|---|---|
| Full-stack framework | Next.js 16 (App Router, Turbopack) | Server Components + colocated API routes let the district-scoped query layer live server-side by default |
| Language | TypeScript | Static types across the DB schema (Prisma-generated), the engine, and the API boundary (Zod) |
| Database | PostgreSQL (Supabase), Prisma ORM | Managed Postgres with a pooled connection string; Prisma migrations for schema history |
| Auth | Argon2, `jose` (JWT), custom OTP | Argon2 is the current recommended password hash; `jose` is a lightweight, edge-compatible JWT library |
| AI | NVIDIA NIM (`nemotron-3-nano-30b-a3b`), OpenAI-compatible SDK | Free-tier-accessible, low-latency MoE model suited to a batch document-processing workload |
| Validation | Zod | Schema validation at every API route boundary |
| Email | Resend | Modern, simple transactional email API |
| Styling/animation | Tailwind CSS v4, Framer Motion | Utility-first styling; Framer Motion for the public showcase page's scroll/animation effects |
| Testing | Vitest | Unit tests for the engine, AI grounding logic, crypto round-trip, and entity resolution |
| Scheduling | Vercel Cron | HTTP-triggered cron, no separate worker infrastructure needed to ship the escalation/retention jobs |

## 7. Data model summary

See [`prisma/schema.prisma`](prisma/schema.prisma) for the authoritative definition. Core entities: `User`, `District`, `Person`, `Case`, `KnowledgeBaseSection`, `ExtractedFact`, `FormulaResult`, `TrackBFlag`, `Application`, `CaseStatusEvent`, `AuditLog`. Notable design choices:
- `priorConvictions` has **no dedicated column on `Case`** — it must always be traceable to a source (`ExtractedFact`, AI-extracted or manually asserted), never a bare, unexplained boolean.
- `FormulaResult`/`TrackBFlag` are recomputed and **deleted, not left stale**, whenever a recompute changes a case's exclusion status — so a case that becomes excluded can never still show up in a ranked "eligible" list from a previous computation.

## 8. Testing

Vitest unit tests cover the parts of the system where a silent regression would be dangerous: the eligibility engine (`threshold.test.ts`, `rank.test.ts`, `trackB.test.ts`, `exclusions.test.ts`), the AI grounding/hedge-detection logic (`extraction.test.ts`), the encryption round-trip (`crypto.test.ts`), and entity resolution scoring (`entityResolution.test.ts`). Run with `npm test`.

## 9. Known limitations

- Custody duration is modeled as one continuous stretch from arrest date to today — a documented simplification; a production system would need to track discrete custody intervals (e.g., periods on bail that were later revoked).
- The state-level dashboard reports on cases *this system has processed*, not true population coverage — it has no external total-prisoner count (e.g., from e-Prisons) to compute a genuine "% of eligible population reached" figure.
- SMS OTP delivery is stubbed to a console log unless Twilio credentials are supplied — functionally complete for development, but real SMS delivery needs a paid Twilio account wired in.
- Scheduled jobs run as HTTP endpoints triggered by Vercel Cron rather than a persistent queue worker (e.g., BullMQ+Redis) — adequate for the current daily/weekly cadence, but the escalation logic itself already lives in a framework-independent module (`lib/engine/escalation.ts`) specifically so it can be moved to a different scheduler later without being rewritten.

## 10. Conclusion

Justify-Sync demonstrates a workable pattern for applying AI to a legal-process problem without letting AI make the legal decision: a small, pure, heavily-tested rules engine owns eligibility; an AI layer with explicit grounding and self-check owns the tedious document-reading and drafting; and a human lawyer remains the mandatory last step before anything reaches a court. Every other feature in the system — district scoping, encryption at rest, audit logging, escalation, retention — exists to make that core loop trustworthy enough to run against real undertrial records.
