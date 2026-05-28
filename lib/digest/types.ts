import type { LlmRunOptions } from "@/lib/agent/llm";
import type { AgentTaskStatus, Item, Source } from "@/lib/domain";

export interface DigestEntry {
  item: Item;
  source: Source;
}

export interface DigestReference {
  index: number;
  itemId: string;
}

export interface DigestSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  provider?: string;
}

export interface GenerateDigestInput {
  entries: DigestEntry[];
  llmOptions?: LlmRunOptions;
  settings: DigestSettings;
}

export interface GenerateDigestResult {
  error?: string;
  output: string;
  references: DigestReference[];
  status: AgentTaskStatus;
  usedFallback: boolean;
}
