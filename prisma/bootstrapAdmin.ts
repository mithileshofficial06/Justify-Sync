/**
 * v5 Stage 0: "the first District Admin account is verified out-of-band
 * (in person / official letter) since no lawyer accounts exist yet to
 * approve one another."
 *
 * This is a deliberately separate, manual, one-off script — never wired
 * into `db:seed` or any automated pipeline — because it creates an ACTIVE
 * account directly, bypassing the normal registration+approval flow. Run
 * it yourself, once, per district that needs a first admin.
 *
 * Usage: set the BOOTSTRAP_ADMIN_* vars in .env (not committed), then:
 *   npx tsx prisma/bootstrapAdmin.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { PILOT_DISTRICT_ID } from "./seed";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env — see the usage note at the top of this file.`);
  }
  return value;
}

async function main() {
  const fullName = requireEnv("BOOTSTRAP_ADMIN_NAME");
  const barEnrolmentNo = requireEnv("BOOTSTRAP_ADMIN_BAR_NO");
  const email = requireEnv("BOOTSTRAP_ADMIN_EMAIL");
  const mobileNumber = requireEnv("BOOTSTRAP_ADMIN_MOBILE");
  const password = requireEnv("BOOTSTRAP_ADMIN_PASSWORD");
  const districtId = process.env.BOOTSTRAP_ADMIN_DISTRICT_ID ?? PILOT_DISTRICT_ID;

  const existing = await prisma.user.findUnique({ where: { barEnrolmentNo } });
  if (existing) {
    console.log(`User with enrolment number ${barEnrolmentNo} already exists (id: ${existing.id}). Nothing to do.`);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      fullName,
      barEnrolmentNo,
      role: "DISTRICT_ADMIN",
      districtId,
      email,
      mobileNumber,
      passwordHash,
      status: "ACTIVE", // bypasses the normal approval flow, deliberately, per v5 Stage 0
    },
  });

  console.log(`Created District Admin ${user.fullName} (${user.id}) for district ${districtId}, status ACTIVE.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
