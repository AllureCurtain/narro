import { llmIsConfigured, runOpenAiCompatibleTask } from "@/lib/agent/llm";
import type { DigestEntry, GenerateDigestInput, GenerateDigestResult } from "./types";

export function buildDigestPrompt(entries: DigestEntry[]): string {
  const itemLines = entries
    .map(({ item, source }, index) => {
      const reference = index + 1;
      return [
        `[${reference}] ${item.title}`,
        `来源: ${source.name}`,
        `链接: ${item.url}`,
        `摘要: ${item.summary}`,
        `实体: ${item.entities.join(", ") || "无"}`,
        `重要性: ${item.importanceScore}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    "请基于下面的资料生成一篇中文科技简报。",
    "要求：",
    "- 输出 3 到 5 个 Markdown 二级标题。",
    "- 总共 6 到 10 条要点。",
    "- 每条要点必须引用编号，例如 [1] 或 [1][3]。",
    "- 合并重复或高度相似的信息。",
    "- 每条说明为什么重要，不要复述标题。",
    "- 不要编造资料中没有的事实。",
    "",
    itemLines
  ].join("\n");
}

export async function generateDigestFromItems(input: GenerateDigestInput): Promise<GenerateDigestResult> {
  const references = input.entries.map(({ item }, index) => ({ index: index + 1, itemId: item.id }));

  if (input.entries.length === 0) {
    return {
      output: "## 今日重点\n- 当前还没有可用于生成简报的信息。请先刷新默认科技源。",
      references: [],
      status: "completed",
      usedFallback: true
    };
  }

  const settings = {
    provider: input.settings.provider,
    baseUrl: input.settings.baseUrl,
    model: input.settings.model
  };
  const apiKey = input.settings.apiKey || input.llmOptions?.apiKey;

  if (llmIsConfigured(settings, { ...input.llmOptions, apiKey })) {
    const result = await runOpenAiCompatibleTask(
      settings,
      {
        items: input.entries.map((entry) => entry.item),
        selectedItem: null,
        taskInput: buildDigestPrompt(input.entries),
        type: "daily_brief"
      },
      { ...input.llmOptions, apiKey }
    );

    if (result.ok && result.output) {
      return {
        output: result.output,
        references,
        status: "completed",
        usedFallback: false
      };
    }

    return {
      error: result.error ?? "LLM digest generation failed",
      output: buildFallbackDigest(input.entries),
      references,
      status: "completed",
      usedFallback: true
    };
  }

  return {
    output: buildFallbackDigest(input.entries),
    references,
    status: "completed",
    usedFallback: true
  };
}

function buildFallbackDigest(entries: DigestEntry[]): string {
  const top = entries.slice(0, 5);
  const continued = entries.slice(5, 10);

  const topLines = top.map(({ item, source }, index) => `- [${index + 1}] ${item.title}。来源：${source.name}。`);
  const continuedLines = continued.map(
    ({ item, source }, index) => `- [${index + 6}] ${item.title}。来源：${source.name}。`
  );

  return [
    "## 今日重点",
    ...topLines,
    continuedLines.length > 0 ? "" : null,
    continuedLines.length > 0 ? "## 可继续阅读" : null,
    ...continuedLines
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

export function parseDigestReferenceIndexes(output: string): number[] {
  return [...output.matchAll(/\[(\d+)\]/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
}
