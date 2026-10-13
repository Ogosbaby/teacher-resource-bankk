import { QwenProvider } from "./providers/qwen";
import type { AIProvider } from "./types";

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) {
    provider = new QwenProvider();
  }
  return provider;
}

export type { AIProvider, ChatMessage } from "./types";
