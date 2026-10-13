/** Turn a title into a URL-safe slug. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");

  return base || "untitled";
}

/**
 * Find a free variant of the slug. `taken` should report whether a slug is
 * already used (optionally excluding the row being edited).
 */
export async function uniqueSlug(
  desired: string,
  taken: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(desired);
  let candidate = base;
  let n = 2;
  while (await taken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 200) return `${base}-${Date.now()}`;
  }
  return candidate;
}
