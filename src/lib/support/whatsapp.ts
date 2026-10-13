/**
 * Support WhatsApp number, in international format without symbols
 * (e.g. "2348012345678" for a Nigerian +234 80 123 45678 number).
 *
 * Set NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER in your environment — it must be
 * public (NEXT_PUBLIC_) because the link is built client-side. Falls back to
 * a placeholder so the app still runs before this is configured; replace it
 * before going live.
 */
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? "2340000000000";

export function getWhatsAppSupportUrl(prefillText?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!prefillText) return base;
  return `${base}?text=${encodeURIComponent(prefillText)}`;
}
