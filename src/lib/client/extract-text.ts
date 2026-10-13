/**
 * Extracts plain text from a teacher's uploaded "rough draft" file, entirely
 * in the browser. Nothing here touches a server: this keeps the AI-refine
 * flow file-server-free, matching the platform's offline-first direction
 * (no backend file-handling service to run and keep online).
 *
 * Supports:
 *  - .pdf, parsed with pdfjs-dist directly in the browser
 *  - .txt / .md, read as plain text
 *
 * Anything else is rejected with a clear message rather than silently
 * producing garbage for the AI to "refine".
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(file);
  }

  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    file.type.startsWith("text/")
  ) {
    return file.text();
  }

  throw new Error(
    "Unsupported file type. Upload a PDF, .txt, or .md file with your rough draft.",
  );
}

async function extractPdfText(file: File): Promise<string> {
  // Dynamically imported so pdfjs-dist is never pulled into a server bundle.
  // The worker is served as a static asset in /public so webpack does not try
  // to parse and minify the bundled pdfjs worker during Next build.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  const joined = pages.join("\n\n").trim();
  if (!joined) {
    throw new Error(
      "Couldn't read any text from that PDF. If it's a scanned image, try pasting the text directly instead.",
    );
  }
  return joined;
}
