"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Prompt = {
  question: string;
  answer: string;
  source: string;
};

const PROMPTS: Prompt[] = [
  {
    question: "Simplify photosynthesis for JSS 1.",
    answer:
      "Think of a leaf as a tiny kitchen. Sunlight is the stove, water and carbon dioxide are the ingredients, and glucose plus oxygen are what comes out. Start with that image before naming chlorophyll.",
    source: "Basic Science · Term 2 · Week 4 scheme of work",
  },
  {
    question: "Give me a 10-minute starter activity for fractions.",
    answer:
      "Hand out paper strips and have pairs fold one into quarters, then race to shade 3/4. Collect answers on the board before naming numerator and denominator.",
    source: "Mathematics · Primary 5 lesson plan",
  },
  {
    question: "How do I explain this to a slow learner?",
    answer:
      "Break the concept into one step per sentence, pair it with a real object in the room, and ask the student to repeat it back in their own words before moving on.",
    source: "Teaching assistant · grounded in published resources",
  },
];

export function InteractiveDemo() {
  const [active, setActive] = useState(0);
  const prompt = PROMPTS[active];

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-ink shadow-2xl shadow-neutral-900/30">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        </div>
        <p className="label-mono text-[10px] text-neutral-500">Teaching assistant · live preview</p>
      </div>

      <div className="space-y-4 px-5 py-6">
        {/* User message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100"
          >
            {prompt.question}
          </motion.div>
        </AnimatePresence>

        {/* Assistant response */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`a-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="max-w-[92%] rounded-xl rounded-tl-sm border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <p className="text-sm leading-relaxed text-neutral-200">{prompt.answer}</p>
            <p className="label-mono mt-3 border-t border-neutral-800 pt-2 text-[9px] text-accent">
              {prompt.source}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prompt chips */}
      <div className="flex flex-wrap gap-2 border-t border-neutral-800 px-5 py-4">
        {PROMPTS.map((p, i) => (
          <button
            key={p.question}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
              i === active
                ? "border-accent bg-accent/10 text-accent"
                : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
            }`}
          >
            {p.question}
          </button>
        ))}
      </div>
    </div>
  );
}
