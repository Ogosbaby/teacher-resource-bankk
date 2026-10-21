/**
 * Automatically formats activation code input into standard TRB hyphenated chunks.
 * Example outputs:
 *   "TRB" -> "TRB-"
 *   "TRBA1B2" -> "TRB-A1B2-"
 *   "TRBA1B2C3D4" -> "TRB-A1B2-C3D4"
 */
export function formatActivationCodeInput(raw: string, prev = ""): string {
  // Allow user to backspace past a trailing hyphen
  if (prev.endsWith("-") && raw === prev.slice(0, -1)) {
    return raw;
  }

  // Clean all characters except uppercase alphanumerics
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return "";

  // If user started typing TRB
  if (clean.startsWith("TRB")) {
    const rest = clean.slice(3);
    if (!rest) {
      // Auto-append dash if they just typed TRB
      return "TRB-";
    }

    const chunks = ["TRB"];
    for (let i = 0; i < rest.length; i += 4) {
      chunks.push(rest.slice(i, i + 4));
    }
    return chunks.join("-");
  }

  // If user typed 'T' or 'TR', keep as is until TRB
  if (clean === "T" || clean === "TR") {
    return clean;
  }

  // If they typed without TRB prefix, chunk every 4 characters
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    chunks.push(clean.slice(i, i + 4));
  }
  return chunks.join("-");
}
