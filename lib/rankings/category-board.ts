import type { Item, Source } from "@/lib/domain";

export type CategoryId =
  | "ai-models"
  | "developer-community"
  | "engineering-open-source"
  | "product-platform"
  | "chinese-tech";

export interface CategoryDefinition {
  description: string;
  id: CategoryId;
  title: string;
}

export interface CategoryBoard {
  categories: CategoryRanking[];
  totalItemCount: number;
  updatedSourceCount: number;
}

export interface CategoryRanking {
  description: string;
  id: CategoryId;
  items: RankedCategoryItem[];
  title: string;
}

export interface RankedCategoryItem {
  item: Item;
  rank: number;
  source: Source;
}

export interface BuildCategoryBoardInput {
  items: Item[];
  maxItemsPerCategory?: number;
  sources: Source[];
}

export const categoryDefinitions: CategoryDefinition[] = [
  {
    id: "ai-models",
    title: "AI / 模型",
    description: "模型厂商、AI 工具、本地模型与 agent/coding/model 动态"
  },
  {
    id: "developer-community",
    title: "开发者社区",
    description: "Hacker News、Lobsters 等开发者社区高信号讨论"
  },
  {
    id: "engineering-open-source",
    title: "工程 / 开源",
    description: "框架、运行时、基础设施、开源工程和工程实践"
  },
  {
    id: "product-platform",
    title: "产品 / 平台",
    description: "平台能力、API、changelog 和产品更新"
  },
  {
    id: "chinese-tech",
    title: "中文技术",
    description: "中文技术媒体、团队博客、周刊和科技内容"
  }
];

const categoryPriority: CategoryId[] = [
  "chinese-tech",
  "developer-community",
  "ai-models",
  "product-platform",
  "engineering-open-source"
];

const sourceIdsByCategory: Record<CategoryId, string[]> = {
  "ai-models": ["hugging-face-blog", "google-ai-blog", "aws-machine-learning-blog", "ollama-blog"],
  "developer-community": ["hacker-news-rss", "lobsters-rss"],
  "engineering-open-source": [
    "github-engineering",
    "react-blog",
    "nextjs-blog",
    "nodejs-blog",
    "nodejs-releases",
    "typescript-blog",
    "tailwind-css-blog",
    "cloudflare-blog",
    "deno-blog",
    "bun-blog",
    "rust-blog",
    "go-blog",
    "kubernetes-blog",
    "docker-blog"
  ],
  "product-platform": ["github-changelog", "vercel-changelog", "stripe-blog", "apple-developer-news"],
  "chinese-tech": ["ruanyifeng-weekly", "sspai", "infoq-cn", "meituan-tech", "solidot"]
};

const keywordsByCategory: Record<CategoryId, string[]> = {
  "ai-models": ["ai", "agent", "agentic", "coding", "llm", "model", "openai", "anthropic", "claude", "gemini", "hugging face", "ollama"],
  "developer-community": ["show hn", "ask hn", "hacker news", "lobsters"],
  "engineering-open-source": ["framework", "runtime", "open source", "opensource", "compiler", "react", "next.js", "node.js", "typescript", "cloudflare", "kubernetes", "docker", "rust", "golang"],
  "product-platform": ["api", "platform", "product", "changelog", "release notes", "pricing", "dashboard", "github", "vercel", "stripe"],
  "chinese-tech": ["中文", "架构", "周刊", "技术团队", "开源中国", "少数派", "阮一峰", "美团", "solidot", "infoq"]
};

const groupByCategory: Record<CategoryId, string[]> = {
  "ai-models": ["模型厂商"],
  "developer-community": ["社区讨论"],
  "engineering-open-source": ["工程技术", "代码动态", "安全公告"],
  "product-platform": ["产品更新", "API"],
  "chinese-tech": ["中文技术"]
};

export function buildCategoryBoard({
  items,
  maxItemsPerCategory = 10,
  sources
}: BuildCategoryBoardInput): CategoryBoard {
  const sourceById = new Map(sources.filter((source) => source.id !== "all").map((source) => [source.id, source]));
  const buckets = new Map<CategoryId, RankedCategoryItem[]>(
    categoryDefinitions.map((category) => [category.id, []])
  );

  for (const item of items) {
    if (item.hidden) continue;

    const source = sourceById.get(item.sourceId);
    if (!source) continue;

    const categoryId = classifyItem(item, source);
    if (!categoryId) continue;

    buckets.get(categoryId)?.push({
      item,
      rank: 0,
      source
    });
  }

  const categories = categoryDefinitions.map((definition) => {
    const rankedItems = (buckets.get(definition.id) ?? [])
      .sort(compareRankedItems)
      .slice(0, maxItemsPerCategory)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    return {
      ...definition,
      items: rankedItems
    };
  });

  return {
    categories,
    totalItemCount: categories.reduce((total, category) => total + category.items.length, 0),
    updatedSourceCount: sources.filter((source) => source.id !== "all" && source.lastFetchedAt).length
  };
}

function classifyItem(item: Item, source: Source): CategoryId | null {
  return categoryPriority.find((categoryId) => itemMatchesCategory(item, source, categoryId)) ?? null;
}

function itemMatchesCategory(item: Item, source: Source, categoryId: CategoryId): boolean {
  if (sourceIdsByCategory[categoryId].includes(source.id)) return true;
  if (groupByCategory[categoryId].includes(source.group)) return true;

  const text = searchableText(item, source);
  return keywordsByCategory[categoryId].some((keyword) => text.includes(keyword));
}

function searchableText(item: Item, source: Source): string {
  return [
    item.title,
    item.summary,
    item.aiSummary,
    item.author,
    item.language,
    source.name,
    source.group,
    item.tags.join(" "),
    item.entities.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function compareRankedItems(left: RankedCategoryItem, right: RankedCategoryItem): number {
  const importanceDelta = right.item.importanceScore - left.item.importanceScore;
  if (importanceDelta !== 0) return importanceDelta;

  const dateDelta = new Date(right.item.publishedAt).valueOf() - new Date(left.item.publishedAt).valueOf();
  if (dateDelta !== 0) return dateDelta;

  return left.item.title.localeCompare(right.item.title);
}
