export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  /**
   * Identifies the model behind this provider, recorded on generated content as
   * `aiModelVersion`. Kept on the interface so callers never need to know which
   * vendor is in use — swappability stays intact.
   */
  readonly modelVersion: string;
  /** Streams response tokens as they're generated. */
  streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
  /** Returns an embedding vector for a piece of text. */
  embed(text: string): Promise<number[]>;
}
