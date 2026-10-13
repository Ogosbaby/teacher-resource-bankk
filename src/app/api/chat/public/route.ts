import { NextRequest, NextResponse } from "next/server";
import { retrieveFaqAnswer } from "@/lib/faq/faq-bank";

/**
 * Public, unauthenticated FAQ assistant for the landing page's
 * "Ask Me Anything" widget.
 *
 * Deliberately NOT an AI-generation endpoint: it only ever retrieves a
 * pre-written answer from the FAQ bank (see lib/faq/faq-bank.ts). If nothing
 * in the bank is a good match, it says so and hands the visitor off to
 * WhatsApp support rather than guessing or inventing platform details.
 */
export async function POST(req: NextRequest) {
  const { message } = (await req.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const match = retrieveFaqAnswer(message.slice(0, 500));

  if (match) {
    return NextResponse.json({
      matched: true,
      faqId: match.id,
      answer: match.answer,
    });
  }

  return NextResponse.json({ matched: false });
}
