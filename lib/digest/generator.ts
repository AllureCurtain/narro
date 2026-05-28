import { llmIsConfigured, runOpenAiCompatibleTask } from "@/lib/agent/llm";
import { groupDigestEntries } from "./topic-groups";
import type { DigestEntry, GenerateDigestInput, GenerateDigestResult } from "./types";

export function buildDigestPrompt(entries: DigestEntry[]): string {
  const groups = groupDigestEntries(entries);
  const itemLines = groups
    .map((group) => {
      const lines = group.entries.map(({ item, source }) => {
        const reference = entries.findIndex((entry) => entry.item.id === item.id) + 1;
        return [
          `[${reference}] ${item.title}`,
          `来源: ${source.name}`,
          `链接: ${item.url}`,
          `摘要: ${item.summary}`,
          `实体: ${item.entities.join(", ") || "无"}`,
          `重要性: ${item.importanceScore}`
        ].join("\n");
      });

      return `### ${group.title}\n${lines.join("\n\n")}`;
    })
    .join("\n\n");

  return [
    "请基于下面的资料生成一篇中文科技简报。",
    "按以下分组组织简报，但只输出有真实内容的分组。",
    "要求：",
    "- 输出 3 到 5 个 Markdown 二级标题。",
    "- 总共 6 到 10 条要点；资料不足时可以少于 6 条。",
    "- 每条要点必须引用编号，例如 [1] 或 [1][3]。",
    "- 合并重复或高度相似的信息，合并时保留多个引用编号。",
    "- 每条必须说明为什么重要，避免只复述标题。",
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
  const selectedEntries = entries.slice(0, 10);
  const groups = groupDigestEntries(selectedEntries);

  return groups
    .flatMap((group) => [
      `## ${group.title}`,
      ...group.entries.map(({ item, source }) => {
        const reference = entries.findIndex((entry) => entry.item.id === item.id) + 1;
        const summary = item.summary ? ` ${item.summary}` : "";
        return `- [${reference}] ${item.title}。值得关注：${summary || "这条信息可能影响近期技术判断"} 来源：${source.name}。`;
      }),
      ""
    ])
    .join("\n")
    .trim();
}

export function parseDigestReferenceIndexes(output: string): number[] {
  return [...output.matchAll(/\[(\d+)\]/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
}
