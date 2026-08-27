import { Resend } from "resend";

/**
 * v5 Stage 9 — real notification delivery, not a stub. The notification
 * body itself never contains case data (v5 §5.3/Stage 9) — only a link
 * that requires authentication to open.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — would send "${subject}" to ${to}. Set it in .env to send for real.`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.NOTIFICATION_FROM_EMAIL || "Justify-Sync <onboarding@resend.dev>",
    to,
    subject,
    text,
  });

  if (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}
