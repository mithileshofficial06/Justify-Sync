// Imported by server code and by prisma/seedDemoAccounts.ts only — never by a client component.

export type DemoRole = "LAWYER" | "DISTRICT_ADMIN" | "STATE_ADMIN";

export interface DemoAccount {
  barEnrolmentNo: string;
  password: string;
  role: DemoRole;
  fullName: string;
  email: string;
  mobileNumber: string;
  roleLabel: string;
  sees: string;
}

// The OTP step is never skipped for these accounts — the code is only
// auto-filled on screen so a judge without a registered mobile can pass it.
export const DEMO_OTP = "123456";

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    barEnrolmentNo: "TN/1234/2015",
    password: "JuriSync@Demo1",
    role: "LAWYER",
    fullName: "Adv. Meenakshi Sundaram",
    email: "demo.lawyer@jurisync.demo",
    mobileNumber: "+910000000001",
    roleLabel: "DLSA Lawyer",
    sees: "Chennai district ranked worklist, case files, drafts",
  },
  {
    barEnrolmentNo: "TN/5678/2009",
    password: "JuriSync@Demo2",
    role: "DISTRICT_ADMIN",
    fullName: "Adv. Rajasekaran Pillai",
    email: "demo.district@jurisync.demo",
    mobileNumber: "+910000000002",
    roleLabel: "District Admin",
    sees: "Chennai worklist plus pending lawyer approvals",
  },
  {
    barEnrolmentNo: "TN/9012/2004",
    password: "JuriSync@Demo3",
    role: "STATE_ADMIN",
    fullName: "Adv. Lakshmi Narayanan",
    email: "demo.state@jurisync.demo",
    mobileNumber: "+910000000003",
    roleLabel: "State Admin",
    sees: "Per-district funnel across every Tamil Nadu district",
  },
];

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function isDemoAccount(barEnrolmentNo: string): boolean {
  return DEMO_ACCOUNTS.some((a) => a.barEnrolmentNo === barEnrolmentNo);
}

/** Only exposes credentials while demo mode is on — never in a pilot deployment. */
export function getPublicDemoAccounts() {
  if (!isDemoMode()) return [];
  return DEMO_ACCOUNTS.map(({ barEnrolmentNo, password, roleLabel, sees }) => ({
    barEnrolmentNo,
    password,
    roleLabel,
    sees,
  }));
}

export type PublicDemoAccount = ReturnType<typeof getPublicDemoAccounts>[number];
