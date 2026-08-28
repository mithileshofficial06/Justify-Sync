import { hashPassword, verifyPassword } from "./password";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generateOtpCode(): string {
  // TEMP (demo): hardcoded so the demo isn't blocked by SMS delivery.
  return "123456";
}

export async function hashOtpCode(code: string): Promise<string> {
  return hashPassword(code);
}

export async function verifyOtpCode(hash: string, code: string): Promise<boolean> {
  return verifyPassword(hash, code);
}

export function otpExpiryDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}

/**
 * v5 §5.3 — SMS delivery. Stubbed until Twilio credentials are added to
 * .env: logs the code instead of failing, so the login flow is testable
 * end-to-end in dev without a real SMS provider.
 */
export async function sendOtpSms(mobileNumber: string, code: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn(
      `[otp] Twilio not configured — would send OTP ${code} to ${mobileNumber}. Add TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN to .env to send for real.`
    );
    return;
  }

  // TODO: wire up the real Twilio client once TWILIO_* env vars are set.
  throw new Error("Twilio credentials are set but the send implementation is not wired up yet.");
}
