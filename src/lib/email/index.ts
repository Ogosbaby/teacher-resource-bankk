/**
 * Outbound email.
 *
 * One provider behind a thin seam, in the spirit of the AI and storage modules:
 * callers say "send this", not "call Resend", so the provider stays swappable.
 *
 * The difference from those two is that there is no local fallback — you cannot
 * deliver mail to a filesystem — so an unconfigured deployment reports
 * `skipped` instead of pretending to have sent something. Callers decide whether
 * that is acceptable: the reminder job logs what it would have sent and moves on,
 * because a missing API key must not fail a job that would otherwise succeed.
 *
 * Failures are returned rather than thrown, for the same reason: only the caller
 * knows whether a failed send should be retried.
 */
import { Resend } from "resend";
import nodemailer from "nodemailer";

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim())
  );
}

/**
 * The From header.
 */
export function emailFromAddress(): string {
  if (process.env.SMTP_USER?.trim()) {
    return process.env.REMINDER_FROM_EMAIL?.trim() || `Teacher Resource Bank <${process.env.SMTP_USER.trim()}>`;
  }
  return process.env.REMINDER_FROM_EMAIL?.trim() || "Teacher Resource Bank <onboarding@resend.dev>";
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

function getSmtpTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendEmail(message: OutboundEmail): Promise<EmailResult> {
  // 1. Prefer SMTP if configured (no sandbox restriction to single recipient)
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: emailFromAddress(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      console.log(`[email] Delivered via SMTP to ${message.to}, messageId:`, info.messageId);
      return { status: "sent", id: info.messageId };
    } catch (smtpErr) {
      console.error("[email] SMTP error:", smtpErr);
      return { status: "failed", error: smtpErr instanceof Error ? smtpErr.message : String(smtpErr) };
    }
  }

  // 2. Resend provider
  const resend = getResendClient();
  if (!resend) {
    return { status: "skipped", reason: "Neither RESEND_API_KEY nor SMTP credentials are set." };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      console.warn(`[email] Resend delivery to ${message.to} failed:`, error.message);
      return { status: "failed", error: error.message || JSON.stringify(error) };
    }
    console.log(`[email] Delivered via Resend to ${message.to}, id:`, data?.id);
    return { status: "sent", id: data?.id ?? null };
  } catch (err) {
    console.error("[email] Resend exception:", err);
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
