import type { Item } from "@/lib/domain";
import type { LlmRunOptions, LlmSettings } from "./llm";
import { llmIsConfigured, runOpenAiCompatibleTask } from "./llm";

export interface SummarizeOptions {
  batchSize?: number;
  llmOptions?: LlmRunOptions;
  settings: LlmSettings;
}

export async function generateItemSummary(
  item: Item,
  options: SummarizeOptions
): Promise<string> {
  if (!llmIsConfigured(options.settings, options.llmOptions)) return "";

  const result = await runOpenAiCompatibleTask(
    options.settings,
    {
      items: [item],
      selectedItem: item,
      taskInput: "",
      type: "summarize_item"
    },
    options.llmOptions
  );

  return result.ok ? (result.output ?? "") : "";
}

export async function summarizeItemsBatch(
  items: Item[],
  options: SummarizeOptions
): Promise<Map<string, string>> {
  if (!llmIsConfigured(options.settings, options.llmOptions)) return new Map();

  const batchSize = options.batchSize ?? 5;
  const results = new Map<string, string>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await runOpenAiCompatibleTask(
      options.settings,
      {
        items: batch,
        selectedItem: null,
        taskInput: "",
        type: "batch_summarize"
      },
      options.llmOptions
    );

    if (result.ok && result.output) {
      parseBatchSummaries(result.output, batch, results);
    }
  }

  return results;
}

function parseBatchSummaries(output: string, items: Item[], results: Map<string, string>) {
  const lines = output.split("\n").filter((line) => line.trim());

  if (lines.length === 1 && items.length === 1) {
    results.set(items[0].id, lines[0].trim());
    return;
  }

  const numbered = lines.filter((line) => /^\d+[\.\)、]/.test(line.trim()));
  if (numbered.length > 0) {
    for (let i = 0; i < Math.min(numbered.length, items.length); i++) {
      const summary = numbered[i].replace(/^\d+[\.\)、]\s*/, "").trim();
      if (summary) results.set(items[i].id, summary);
    }
    return;
  }

  for (let i = 0; i < Math.min(lines.length, items.length); i++) {
    if (lines[i].trim()) results.set(items[i].id, lines[i].trim());
  }
}
