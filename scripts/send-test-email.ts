/**
 * Send a test email, to prove the provider integration works.
 *
 *   npm run email:test -- --to=you@example.com
 *
 * Real renewal reminders only fire for a subscription inside the reminder window,
 * which is not something you can arrange on demand. This sends the same message
 * shape immediately, so a key can be checked in seconds.
 *
 * Without `RESEND_API_KEY` it reports that and exits non-zero, because the point
 * of running it is to find out whether mail can actually leave.
 */
import "dotenv/config";
import { emailFromAddress, isEmailConfigured, sendEmail } from "../src/lib/email";
import { renewalReminderEmail } from "../src/lib/email/renewal-reminder";

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

async function main() {
  const to = arg("to");
  if (!to) {
    console.error("Usage: npm run email:test -- --to=you@example.com");
    process.exit(1);
  }

  console.log(`From: ${emailFromAddress()}`);
  console.log(`Configured: ${isEmailConfigured() ? "yes" : "no (RESEND_API_KEY is not set)"}`);

  const message = renewalReminderEmail({
    id: "test",
    userId: "test",
    subscriptionId: null,
    type: "renewal_reminder",
    channel: "email",
    scheduledFor: new Date(),
    sentAt: null,
    email: to,
    name: arg("name") ?? "Test Teacher",
    // A date inside the reminder window, so the rendered copy is the real one.
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  const result = await sendEmail(message);

  if (result.status === "sent") {
    console.log(`\nSent. Provider id: ${result.id ?? "unknown"}`);
    console.log(`Subject: ${message.subject}`);
    return;
  }

  console.error(`\n${result.status === "skipped" ? "Not sent" : "Failed"}: ${
    result.status === "skipped" ? result.reason : result.error
  }`);
  if (result.status === "failed") {
    console.error(
      "\nA 403 here usually means the From address is not verified for this key.\n" +
        "With Resend's shared sender, mail can only go to the account owner's address."
    );
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("\nTest send failed:", error);
  process.exit(1);
});
