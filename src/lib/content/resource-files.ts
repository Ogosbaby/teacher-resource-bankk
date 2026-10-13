/**
 * What a resource file is allowed to be.
 *
 * Split into a plain, client-safe module for the same reason `resource-types.ts`
 * is: the upload form has to state the rules ("PDF, Word, spreadsheet or image,
 * up to 25 MB") and the server has to *enforce* them. One place to state them
 * means the two cannot disagree — and a mismatch there is the kind that shows up
 * as a form that accepts a file the endpoint then rejects.
 *
 * The server is still the authority: nothing here is a security control, since the
 * client already holds it. The endpoint re-runs every check.
 */

/** 25 MB. Big enough for a scanned scheme of work, small enough to stream. */
export const MAX_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Content types the resource bank accepts, mapped to the extension the file is
 * stored under. Deliberately a fixed map rather than "anything the browser says":
 * an allow-list is the only version of this that stays true as browsers add types.
 */
export const RESOURCE_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/**
 * The inverse of `fileExtensionFor`, for callers that have a path and no browser:
 * the CLI that attaches a file from disk has only the extension to go on.
 */
export function contentTypeForExtension(extension: string): string | null {
  const wanted = extension.replace(/^\./, "").toLowerCase();
  return Object.entries(RESOURCE_FILE_TYPES).find(([, ext]) => ext === wanted)?.[0] ?? null;
}

/** Human-readable list for messages, e.g. "PDF, Word, Excel, PowerPoint, text, PNG or JPEG". */
export const RESOURCE_FILE_TYPE_LABEL =
  "PDF, Word, Excel, PowerPoint, text, CSV, PNG or JPEG";

/**
 * The same allow-list as a value an `<input accept>` can use.
 *
 * Derived from the map rather than written out again, so the file picker and the
 * check the server runs are the same list by construction — the two drifting apart
 * is exactly how a picker ends up offering files the endpoint then rejects.
 *
 * `accept` also matters on phones: the native switcher filters to these types
 * instead of showing a camera roll and a download folder full of unusable files.
 */
export const RESOURCE_FILE_ACCEPT = Object.keys(RESOURCE_FILE_TYPES).join(",");

/** The stored extension for a content type, or null when it is not accepted. */
export function fileExtensionFor(contentType: string): string | null {
  return RESOURCE_FILE_TYPES[contentType.split(";")[0].trim().toLowerCase()] ?? null;
}

/**
 * A filename that is safe to use as the last segment of a storage key and as the
 * `Content-Disposition` value: no separators, no traversal, no leading dot, and
 * always carrying the extension the content type implies.
 *
 * The extension is appended rather than preserved from the upload because the two
 * can disagree, and the content type is the one the serving route reports.
 */
export function sanitiseResourceFileName(name: string, extension: string): string {
  const base = (name || "")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);

  return `${base || "resource"}.${extension}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
