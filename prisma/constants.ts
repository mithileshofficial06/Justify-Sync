// A single starting district so the app has somewhere for the first
// registration and bootstrap admin to attach to (v5 Stage 0). Split out
// from seed.ts specifically so other scripts (bootstrapAdmin.ts,
// seedSih.ts) can import this constant without also triggering
// seed.ts's own main() — which runs unconditionally at module load, not
// guarded behind an entry-point check.
export const PILOT_DISTRICT_ID = "pilot-district";

// The id stays "pilot-district" so rows created before districts were named keep their link.
export const DISTRICTS = [
  { id: PILOT_DISTRICT_ID, name: "Chennai", state: "Tamil Nadu", slsaContact: "DLSA Chennai, High Court Campus, Chennai 600104" },
  { id: "district-madurai", name: "Madurai", state: "Tamil Nadu", slsaContact: "DLSA Madurai, District Court Complex, Madurai 625020" },
  { id: "district-coimbatore", name: "Coimbatore", state: "Tamil Nadu", slsaContact: "DLSA Coimbatore, Combined Court Complex, Coimbatore 641018" },
] as const;
