import OpenAI from "openai";
import type { AIProvider, ChatMessage } from "../types";
import {
  EmbeddingModelNotConfiguredError,
  assertEmbeddingDimension,
  embeddingModelName,
} from "../embedding";

export class QwenProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  get modelVersion(): string {
    return this.model;
  }

  constructor() {
    this.client = new OpenAI({
      baseURL: process.env.QWEN_BASE_URL || "http://localhost:11434/v1",
      apiKey: process.env.QWEN_API_KEY || "not-needed",
    });
    this.model = process.env.QWEN_MODEL || "qwen-local";
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async embed(text: string): Promise<number[]> {
    // Deliberately NOT falling back to the chat model. A generative model like
    // qwen-local returns meaningless vectors, which would silently poison the
    // index rather than fail — so a missing embedding model is a hard error.
    const model = embeddingModelName();
    if (!model) throw new EmbeddingModelNotConfiguredError();

    const res = await this.client.embeddings.create({ model, input: text });
    const vector = res.data[0]?.embedding ?? [];

    // pgvector columns are fixed-width, so catch a mismatch here with a clear
    // message rather than at insert time.
    assertEmbeddingDimension(vector, model);
    return vector;
  }
}
