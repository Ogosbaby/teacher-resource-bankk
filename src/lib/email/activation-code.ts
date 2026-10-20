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

  const appUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://teacher-resource-bankk.vercel.app";

  const downloadUrl = `${appUrl}/api/downloads/apk`;

  const subject = `Your Teacher Resource Bank Activation Code: ${input.code}`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Thank you for subscribing to Teacher Resource Bank! Your Nigerian Academic Term Pass (${term}) is ready.`,
    "",
    "=========================================",
    `YOUR ACTIVATION CODE: ${input.code}`,
    "=========================================",
    "",
    `Download TRB Android App: ${downloadUrl}`,
    "",
    "HOW TO DOWNLOAD AND ACTIVATE YOUR ACCOUNT:",
    "1. DOWNLOAD THE APP: Open the link above on your Android phone to download the TRB app (trb.apk).",
    "2. INSTALL THE APP: Tap the downloaded file in your notifications or Downloads folder to install it (enable 'Install unknown apps' if prompted).",
    "3. OPEN AND INPUT CODE: Launch the TRB app and select 'Input Activation Code'.",
    `4. UNLOCK OFFLINE ACCESS: Enter your code (${input.code}). The app will tailor courses and lesson plans to your selected classes and subjects, and download the offline AI model!`,
    "",
    "Note: Your activation code unlocks full access for the academic term on your device.",
    "Keep this email in a safe place for your records.",
    "",
    "Warm regards,",
    "Teacher Resource Bank Team",
    `${appUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Teacher Resource Bank Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f6f4ee;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border-radius:24px;border:1px solid #e7e5e4;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #047857 0%, #065f46 100%);padding:32px 28px;text-align:center;">
              <div style="font-size:36px;line-height:1;margin-bottom:12px;">🎉</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Term Pass Activated!</h1>
              <p style="margin:6px 0 0;color:#d1fae5;font-size:13px;font-weight:500;">Teacher Resource Bank · Offline Curriculum & AI</p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding:28px 28px 20px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1c1917;">
                Hi <strong>${escapeHtml(firstName)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44403c;">
                Thank you for your payment${input.orderReference ? ` (Ref: <code>${escapeHtml(input.orderReference)}</code>)` : ""}. Your pass gives you <strong>${escapeHtml(term)}</strong> of full access${expiry ? ` through <strong>${escapeHtml(expiry)}</strong>` : ""}.
              </p>

              <!-- Activation Code Box -->
              <div style="background-color:#f0fdf4;border:2px dashed #059669;border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#065f46;text-transform:uppercase;display:block;margin-bottom:8px;">Your Device Activation Code</span>
                <div style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:800;letter-spacing:3px;color:#0f172a;background:#ffffff;padding:12px 18px;border-radius:10px;border:1px solid #a7f3d0;display:inline-block;">
                  ${escapeHtml(input.code)}
                </div>
                <p style="margin:8px 0 0;font-size:11px;color:#047857;">Enter this code when you open the TRB app on your phone</p>
              </div>

              <!-- Primary CTA: Download Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${escapeHtml(downloadUrl)}" style="background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;display:inline-block;box-shadow:0 4px 12px rgba(15,23,42,0.2);">
                  📲 Download TRB Android App (APK)
                </a>
                <p style="margin:8px 0 0;font-size:11px;color:#78716c;">Direct download · Works 100% offline once installed</p>
              </div>

              <!-- 4 Step Guide -->
              <div style="background-color:#fafaf9;border-radius:16px;border:1px solid #e7e5e4;padding:20px;margin-bottom:20px;">
                <h3 style="margin:0 0 14px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#292524;">
                  How to Download & Activate Your Account:
                </h3>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="28" valign="top" style="padding-bottom:12px;">
                      <span style="background-color:#047857;color:#ffffff;font-size:11px;font-weight:bold;width:20px;height:20px;line-height:20px;display:inline-block;text-align:center;border-radius:50%;">1</span>
                    </td>
                    <td valign="top" style="padding-bottom:12px;font-size:13px;line-height:1.5;color:#44403c;">
                      <strong>Download App:</strong> Click the black button above on your Android phone to download <code>trb.apk</code>.
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding-bottom:12px;">
                      <span style="background-color:#047857;color:#ffffff;font-size:11px;font-weight:bold;width:20px;height:20px;line-height:20px;display:inline-block;text-align:center;border-radius:50%;">2</span>
                    </td>
                    <td valign="top" style="padding-bottom:12px;font-size:13px;line-height:1.5;color:#44403c;">
                      <strong>Install APK:</strong> Open the downloaded file to install. If prompted, allow <em>"Install unknown apps"</em> for your browser.
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding-bottom:12px;">
                      <span style="background-color:#047857;color:#ffffff;font-size:11px;font-weight:bold;width:20px;height:20px;line-height:20px;display:inline-block;text-align:center;border-radius:50%;">3</span>
                    </td>
                    <td valign="top" style="padding-bottom:12px;font-size:13px;line-height:1.5;color:#44403c;">
                      <strong>Launch & Select Code:</strong> Open the installed Teacher Resource Bank app and tap <em>"Input Activation Code"</em>.
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top">
                      <span style="background-color:#047857;color:#ffffff;font-size:11px;font-weight:bold;width:20px;height:20px;line-height:20px;display:inline-block;text-align:center;border-radius:50%;">4</span>
                    </td>
                    <td valign="top" style="font-size:13px;line-height:1.5;color:#44403c;">
                      <strong>Enter Code:</strong> Type <code style="font-weight:bold;color:#047857;">${escapeHtml(input.code)}</code>. Your tailored courses, lesson planner, and offline AI will immediately be ready!
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5;">
                Need help? Reply directly to this email or contact support. Have a productive academic term!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f5f4;padding:16px 28px;text-align:center;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:11px;color:#a8a29e;">
                &copy; Teacher Resource Bank · Empowering Nigerian Educators Offline
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
