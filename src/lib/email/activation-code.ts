/**
 * The activation code, as an email.
 *
 * This is the moment the product is actually delivered, so the message is built
 * around one thing: the code, big and copyable, plus the single instruction that
 * turns it into access. Everything else is deliberately short.
 *
 * The code is never linked. It is typed into the installed app, which may be on a
 * different device than the one reading the mail, so a link would be a dead end.
 */
import { sendEmail, type EmailResult, type OutboundEmail } from "./index";

export interface ActivationCodeEmailInput {
  to: string;
  customerName?: string | null;
  code: string;
  months: number;
  expiresAt?: Date | null;
  orderReference?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function activationCodeEmail(input: ActivationCodeEmailInput): OutboundEmail {
  const firstName = input.customerName?.trim().split(/\s+/)[0] || "there";
  const expiry = formatDate(input.expiresAt);
  const term = `${input.months} month${input.months === 1 ? "" : "s"}`;

  const subject = `Your Teacher Resource Bank code: ${input.code}`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Thank you for your payment${input.orderReference ? ` (reference ${input.orderReference})` : ""}.`,
    "",
    `Your activation code is:`,
    "",
    `    ${input.code}`,
    "",
    `It gives you ${term} of access${expiry ? `, up to ${expiry}` : ""}.`,
    "",
    "How to use it:",
    "  1. Install the Teacher Resource Bank app on your phone or Windows computer.",
    "  2. Open it and choose \"Input Activation Code\".",
    "  3. Type the code exactly as shown above.",
    "",
    "A code works on one device, so keep this email in case you need it again.",
    "",
    "— Teacher Resource Bank",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a">
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>
      Thank you for your payment${
        input.orderReference
          ? ` (reference <span style="font-family:monospace">${escapeHtml(input.orderReference)}</span>)`
          : ""
      }.
    </p>
    <p>Your activation code is:</p>
    <p style="font-family:monospace;font-size:24px;font-weight:700;letter-spacing:2px;background:#f3f3f3;padding:16px 20px;border-radius:8px;display:inline-block">
      ${escapeHtml(input.code)}
    </p>
    <p>
      It gives you <strong>${escapeHtml(term)}</strong> of access${
        expiry ? `, up to <strong>${escapeHtml(expiry)}</strong>` : ""
      }.
    </p>
    <p><strong>How to use it</strong></p>
    <ol>
      <li>Install the Teacher Resource Bank app on your phone or Windows computer.</li>
      <li>Open it and choose &ldquo;Input Activation Code&rdquo;.</li>
      <li>Type the code exactly as shown above.</li>
    </ol>
    <p>A code works on one device, so keep this email in case you need it again.</p>
    <p>&mdash; Teacher Resource Bank</p>
  </body>
</html>`;

  return { to: input.to, subject, text, html };
}

/**
 * Send the code, and report whether it actually went out.
 *
 * Delivery failures are returned, never thrown: a failed email must not roll back
 * a payment that has already succeeded. The caller records the result on the
 * activation-code row so an operator can resend from the internal LMS.
 */
export async function sendActivationCodeEmail(
  input: ActivationCodeEmailInput
): Promise<EmailResult> {
  if (!input.to?.trim()) {
    return { status: "skipped", reason: "No delivery address on the order." };
  }
  return sendEmail(activationCodeEmail(input));
}
