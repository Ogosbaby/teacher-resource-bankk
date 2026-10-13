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
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * The From header.
 *
 * Defaults to Resend's shared sender, which works without a verified domain but
 * only delivers to the address that owns the account — enough to test the
 * integration. Set `REMINDER_FROM_EMAIL` to a verified domain address for real
 * sending.
 */
export function emailFromAddress(): string {
  return process.env.REMINDER_FROM_EMAIL?.trim() || "Teacher Resource Bank <onboarding@resend.dev>";
}

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  // Lazily constructed so importing this module (in a route, a job or a script)
  // never requires a key to exist.
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(message: OutboundEmail): Promise<EmailResult> {
  const resend = getClient();
  if (!resend) {
    return { status: "skipped", reason: "RESEND_API_KEY is not set" };
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
      return { status: "failed", error: error.message || JSON.stringify(error) };
    }
    return { status: "sent", id: data?.id ?? null };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
