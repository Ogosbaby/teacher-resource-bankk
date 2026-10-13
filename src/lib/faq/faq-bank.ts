/**
 * The landing page's "Ask Me Anything" widget answers strictly from this
 * bank — it never asks a model to generate an answer. If nothing here is a
 * good match for what the visitor asked, the widget hands them off to
 * WhatsApp support instead of guessing.
 *
 * To add or edit an answer: edit the entries below. `keywords` should list
 * the words a visitor is likely to type, not just formal terms.
 */
export interface FaqEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
}

export const FAQ_BANK: FaqEntry[] = [
  {
    id: "is-it-free",
    question: "How much does it cost? Is it free?",
    keywords: ["free", "cost", "price", "pricing", "cheap", "pay", "paid", "naira", "5000", "term", "fee"],
    answer:
      "Access is **₦5,000 per term** — covering everything on the platform for the full academic term. " +
      "This includes all CPD courses, completion certificates, lesson notes, schemes of work, " +
      "question banks (Primary 1 to SSS 3), and our on-device offline AI assistant. No extra tiers or hidden fees.",
  },
  {
    id: "how-to-download-apk",
    question: "How do I download and install the Android app (trb.apk)?",
    keywords: ["download", "apk", "android", "app", "install", "phone", "trb.apk", "device"],
    answer:
      "You can download our official Android application package (**trb.apk**) directly from our website after registration or from the **Download APK** link. " +
      "Once downloaded onto your phone, tap the file to install it. If Android prompts you to allow installation from unknown sources, allow it and open TRB.",
  },
  {
    id: "activation-code",
    question: "How do I get and use my Activation Code?",
    keywords: ["activation", "code", "activate", "email", "receive", "input", "redeem"],
    answer:
      "When you register and make payment on our website, a unique Activation Code (e.g. `TRB-XXXX-XXXX`) is automatically generated and sent to your email. " +
      "Open the installed TRB app on your phone, choose **'Input Activation Code'**, paste your code, and tap **'Download Resources'** to start.",
  },
  {
    id: "offline-ai-resources",
    question: "Does the AI lesson planner and app work offline without internet?",
    keywords: ["offline", "internet", "data", "wifi", "qwen", "ai", "model", "connection", "network"],
    answer:
      "**Yes, 100% offline!** When you enter your activation code, your app downloads the local Qwen AI model and course curriculum over the internet once. " +
      "After that initial download, the AI lesson planner, teaching assistant, and all lesson notes run completely offline without needing data or internet.",
  },
  {
    id: "whats-included",
    question: "What is included with my subscription?",
    keywords: ["included", "include", "what do i get", "features", "offer", "have", "materials", "syllabus"],
    answer:
      "Your term pass includes:\n\n" +
      "- Structured **CPD courses** with verifiable completion certificates\n" +
      "- An on-device **AI teaching assistant** for lesson starters and classroom strategies\n" +
      "- Complete **lesson notes, schemes of work, and question banks** term-mapped according to the NERDC curriculum from Primary 1 to SSS 3\n" +
      "- Complete offline functionality on your Android mobile device",
  },
  {
    id: "how-long-does-it-take",
    question: "How long does each CPD course take?",
    keywords: ["long", "time", "duration", "hours", "finish", "complete", "pace"],
    answer:
      "Most CPD courses take **45–90 minutes** completed at your own pace. You can pause and pick up later whenever convenient. " +
      "Your access lasts for the **entire 3-month term**, so you have full flexibility.",
  },
  {
    id: "certificates",
    question: "Do I get a certificate when I finish a course?",
    keywords: ["certificate", "certification", "accredited", "proof", "cpd points"],
    answer:
      "Yes — finishing all modules in any CPD course automatically unlocks an official completion certificate that you can save or print.",
  },
  {
    id: "which-levels-subjects",
    question: "Which class levels and subjects are covered?",
    keywords: ["class", "level", "subject", "primary", "jss", "sss", "secondary", "mathematics", "english"],
    answer:
      "We cover the entire Nigerian school curriculum from **Primary 1 through SSS 3** across core subjects (Mathematics, English, Basic Science, etc.), " +
      "as well as essential pedagogical courses.",
  },
  {
    id: "whatsapp-support",
    question: "How do I contact WhatsApp support?",
    keywords: ["whatsapp", "support", "help", "contact", "agent", "call", "chat"],
    answer:
      "Our support team is available on WhatsApp! Tap the **'Continue on WhatsApp'** button or click WhatsApp in our help widget to speak directly with our team.",
  },
];

const STOPWORDS = new Set([
  "a", "an", "the", "is", "it", "are", "am", "do", "does", "did", "i", "you",
  "my", "me", "to", "of", "for", "and", "or", "in", "on", "with", "what",
  "how", "can", "will", "this", "that", "there", "need", "have", "has",
  "get", "your", "about",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Intelligent keyword-overlap retriever with keyword weighting.
 */
export function retrieveFaqAnswer(rawMessage: string): FaqEntry | null {
  const inputTokens = tokenize(rawMessage);
  if (inputTokens.length === 0) return null;

  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of FAQ_BANK) {
    const questionTokens = new Set(tokenize(entry.question));
    const keywordTokens = new Set(entry.keywords.flatMap(tokenize));

    let score = 0;
    for (const t of inputTokens) {
      if (keywordTokens.has(t)) score += 2.0; // Higher weight for keyword hits
      else if (questionTokens.has(t)) score += 1.0;
    }

    if (score > 0) {
      const normalizedScore = score / (inputTokens.length + 1);
      if (!best || normalizedScore > best.score) {
        best = { entry, score: normalizedScore };
      }
    }
  }

  // A score above 0.2 represents at least one relevant keyword hit
  return best && best.score >= 0.2 ? best.entry : null;
}
