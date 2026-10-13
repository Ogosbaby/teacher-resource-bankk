import type { DueReminder } from "@/lib/services/reminders.service";
import type { OutboundEmail } from "./index";

/**
 * The renewal reminder, as an email.
 *
 * Plain and short on purpose. The teacher is not being marketed to — they are
 * being told a date and what to do about it, and the one thing the message has to
 * get right is the instruction: a new activation code is how access continues,
 * because that is how it was granted in the first place. There is no link back
 * into the app, because the app may well be installed on a phone that renders it
 * and the pass is entered there.
 */
export function renewalReminderEmail(reminder: DueReminder): OutboundEmail {
  const firstName = reminder.name.trim().split(/\s+/)[0] || "there";
  const expiry = reminder.expiresAt
    ? reminder.expiresAt.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "soon";

  const days = reminder.expiresAt
    ? Math.max(1, Math.round((reminder.expiresAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const subject = `Your term pass ends on ${expiry}`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Your Teacher Resource Bank term pass ends on ${expiry}${days ? ` — ${days} day${days === 1 ? "" : "s"} from now` : ""}.`,
    "",
    "When it ends, your courses, lesson plans and downloaded resources stay on your device; what stops is new content and AI help.",
    "",
    "To keep going, enter a new activation code in the app: open it, and use the",
    '"Input Activation Code" button at the top of the registration screen.',
    "",
    "If you have already renewed, please ignore this message.",
    "",
    "— Teacher Resource Bank",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a">
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>
      Your <strong>Teacher Resource Bank</strong> term pass ends on
      <strong>${escapeHtml(expiry)}</strong>${
        days ? ` — ${days} day${days === 1 ? "" : "s"} from now` : ""
      }.
    </p>
    <p>
      When it ends, your courses, lesson plans and downloaded resources stay on your
      device; what stops is new content and AI help.
    </p>
    <p>
      To keep going, enter a new activation code in the app — open it and use the
      <strong>“Input Activation Code”</strong> button at the top of the registration
      screen.
    </p>
    <p style="color:#666;font-size:13px">If you have already renewed, please ignore this message.</p>
    <p style="color:#666;font-size:13px">— Teacher Resource Bank</p>
  </body>
</html>`;

  return { to: reminder.email, subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
