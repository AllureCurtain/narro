import type { DigestEntry } from "./types";

export interface DigestTopicGroup {
  entries: DigestEntry[];
  id: "ai-tools" | "follow-up" | "open-source" | "platform" | "top";
  title: string;
}

type DigestTopicDefinition = Omit<DigestTopicGroup, "entries"> & {
  keywords: string[];
};

const groupDefinitions: DigestTopicDefinition[] = [
  {
    id: "top",
    title: "今日重点",
    keywords: ["breaking", "重大", "重磅"]
  },
  {
    id: "ai-tools",
    title: "AI 与开发工具",
    keywords: ["ai", "agent", "coding", "code", "model", "openai", "anthropic", "claude", "gemini", "llm", "开发工具"]
  },
  {
    id: "platform",
    title: "平台与产品变化",
    keywords: ["aws", "google", "cloud", "api", "platform", "product", "pricing", "平台", "产品"]
  },
  {
    id: "open-source",
    title: "工程与开源生态",
    keywords: ["github", "release", "framework", "runtime", "typescript", "react", "next.js", "node.js", "开源", "框架"]
  },
  {
    id: "follow-up",
    title: "值得继续跟踪",
    keywords: []
  }
];

export function groupDigestEntries(entries: DigestEntry[]): DigestTopicGroup[] {
  const groups = new Map<DigestTopicGroup["id"], DigestEntry[]>();

  for (const entry of entries) {
    const group = classifyDigestEntry(entry);
    groups.set(group.id, [...(groups.get(group.id) ?? []), entry]);
  }

  return groupDefinitions
    .map((definition) => ({
      id: definition.id,
      title: definition.title,
      entries: groups.get(definition.id) ?? []
    }))
    .filter((group) => group.entries.length > 0);
}

function classifyDigestEntry(entry: DigestEntry): DigestTopicDefinition {
  const text = [
    entry.item.title,
    entry.item.summary,
    entry.item.tags.join(" "),
    entry.item.entities.join(" "),
    entry.source.name
  ]
    .join(" ")
    .toLowerCase();

  const scoredGroups = groupDefinitions
    .filter((group) => group.keywords.length > 0)
    .map((group) => ({
      group,
      score: group.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  return scoredGroups[0]?.group ?? groupDefinitions[groupDefinitions.length - 1];
}
