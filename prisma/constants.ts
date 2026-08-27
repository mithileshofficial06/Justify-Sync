// A single starting district so the app has somewhere for the first
// registration and bootstrap admin to attach to (v5 Stage 0). Split out
// from seed.ts specifically so other scripts (bootstrapAdmin.ts,
// seedDemoCases.ts) can import this constant without also triggering
// seed.ts's own main() — which runs unconditionally at module load, not
// guarded behind an entry-point check.
export const PILOT_DISTRICT_ID = "pilot-district";
