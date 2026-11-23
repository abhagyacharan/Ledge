import "server-only";
import { z } from "zod";
import { getEmailConfig } from "@/server/env";

export type Email = { to: string; subject: string; text: string; html: string };

/**
 * Emails "sent" without a Resend key (development and tests). Tests read the newest one to follow
 * the reset link; nothing here survives a restart. Never used in production (getEmailConfig).
 */
export const outbox: Email[] = [];

const resendReply = z.object({ id: z.string() });

/**
 * Sends one email. Resend's API is a single POST (https://resend.com/docs/api-reference/emails/send-email),
 * so this uses fetch instead of their SDK. Throws on failure; the caller decides what the visitor sees.
 * Never logs the message body in production (it holds a reset link).
 */
export async function sendEmail(email: Email): Promise<void> {
  const config = getEmailConfig();
  if (config.mode === "off") throw new Error("Email is not set up (RESEND_API_KEY, EMAIL_FROM).");
  if (config.mode === "outbox") {
    outbox.push(email);
    if (process.env.NODE_ENV === "development") {
      console.info(`[email] to ${email.to}: ${email.subject}\n${email.text}`);
    }
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [email.to], ...pick(email) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend refused the email (${response.status}).`);
  resendReply.parse(await response.json());
}

function pick({ subject, text, html }: Email) {
  return { subject, text, html };
}
