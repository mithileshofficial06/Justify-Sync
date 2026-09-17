/**
 * SIH build Module 1: three permanently ACTIVE demo accounts, one per role,
 * so a judge can reach a populated dashboard without contacting the team.
 * Idempotent — re-running resets their passwords, status and lockout state.
 *
 * Usage: npm run db:seed-demo-accounts
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { DEMO_ACCOUNTS } from "../src/lib/demo";
import { DISTRICTS, PILOT_DISTRICT_ID } from "./constants";

const prisma = new PrismaClient();

async function main() {
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { id: d.id },
      update: { name: d.name, state: d.state, slsaContact: d.slsaContact },
      create: { ...d },
    });
  }
  console.log(`Districts ready: ${DISTRICTS.map((d) => d.name).join(", ")}`);

  for (const account of DEMO_ACCOUNTS) {
    const passwordHash = await hashPassword(account.password);
    const districtId = account.role === "STATE_ADMIN" ? null : PILOT_DISTRICT_ID;
    const data = {
      fullName: account.fullName,
      role: account.role,
      districtId,
      email: account.email,
      mobileNumber: account.mobileNumber,
      passwordHash,
      status: "ACTIVE" as const,
      failedLoginAttempts: 0,
      lockedUntil: null,
      otpCodeHash: null,
      otpExpiresAt: null,
    };
    await prisma.user.upsert({
      where: { barEnrolmentNo: account.barEnrolmentNo },
      update: data,
      create: { barEnrolmentNo: account.barEnrolmentNo, ...data },
    });
    console.log(`  ${account.roleLabel.padEnd(15)} ${account.barEnrolmentNo}  /  ${account.password}`);
  }

  // Registrations for the District Admin to approve or reject on stage. They
  // cannot log in (random passwords) and re-running resets them to pending.
  const pendingLawyers = [
    { barEnrolmentNo: "TN/2231/2021", fullName: "Adv. Priya Venkatesan", email: "pending.priya@jurisync.demo", mobileNumber: "+910000000011", daysAgo: 2 },
    { barEnrolmentNo: "TN/0874/2019", fullName: "Adv. Farhan Ali", email: "pending.farhan@jurisync.demo", mobileNumber: "+910000000012", daysAgo: 5 },
  ];
  for (const p of pendingLawyers) {
    const data = {
      fullName: p.fullName,
      role: "LAWYER" as const,
      districtId: PILOT_DISTRICT_ID,
      email: p.email,
      mobileNumber: p.mobileNumber,
      passwordHash: await hashPassword(randomBytes(24).toString("base64")),
      status: "PENDING_VERIFICATION" as const,
      createdAt: new Date(Date.now() - p.daysAgo * 86_400_000),
    };
    await prisma.user.upsert({ where: { barEnrolmentNo: p.barEnrolmentNo }, update: data, create: { barEnrolmentNo: p.barEnrolmentNo, ...data } });
  }
  console.log(`  ${pendingLawyers.length} pending lawyer registrations for the District Admin to review`);

  console.log("\nDemo accounts ready. Set DEMO_MODE=\"true\" for OTP auto-fill and the landing-page panel.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
