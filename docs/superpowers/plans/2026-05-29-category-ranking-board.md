# Category Ranking Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current source-first article list homepage with a TopHub-style five-category technology ranking board while preserving refresh, read/hide actions, search, and optional digest generation.

**Architecture:** Add a pure ranking helper under `lib/rankings` that maps existing `Item[]` and `Source[]` into five fixed category rankings without changing the database schema. Add ranking board UI components under `components/rankings`, then wire `NarroWorkspace` to render the new board and keep the existing digest tools below it.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Phosphor icons, Server Actions, Vitest, Testing Library, existing libSQL/Drizzle repository layer.

---

## Source Documents

- Design spec: `docs/superpowers/specs/2026-05-29-category-ranking-board-design.md`
- Current homepage composition: `components/app-shell/narro-workspace.tsx`
- Current digest workspace: `components/digest/digest-workspace.tsx`
- Current refresh panel: `components/digest/source-refresh-panel.tsx`
- Current item state action: `app/actions.ts`

## Scope Guard

Implement only the category ranking board homepage. Do not add source management UI, Lens editing, OPML, Agent sidebars, event groups, semantic search, chat, scheduled refresh, deployment work, database migrations, or TopHub scraping.

The old backend data and unused legacy components may remain. The homepage must not mount `SourceLensSidebar`, `AgentSidebar`, `FeedWorkspace`, event group UI, OPML UI, or advanced filters.

## File Structure

### Create

- `lib/rankings/category-board.ts`
  - Pure helper for category definitions, item classification, ranking, and board building.

- `tests/category-board.test.ts`
  - Unit tests for classification, priority, hidden filtering, sorting, limit, and missing source behavior.

- `components/rankings/category-ranking-row.tsx`
  - One compact ranking row with rank, article link, source/time metadata, summary, and read/hide actions.

- `components/rankings/category-ranking-card.tsx`
  - One category card containing heading metadata and up to 10 ranking rows.

- `components/rankings/category-board-workspace.tsx`
  - Main homepage body with refresh panel, category navigation, ranking grid, and optional digest tools.

- `tests/category-ranking-card.test.tsx`
  - Component tests for row/card rendering and actions.

- `tests/category-board-workspace.test.tsx`
  - Component tests for the full board workspace.

### Modify

- `components/app-shell/narro-workspace.tsx`
  - Replace `DigestWorkspace` with `CategoryBoardWorkspace`.

- `components/app-shell/top-bar.tsx`
  - Update subtitle from `今日科技简报` to `科技热榜`; optionally show item count if `WorkspaceSummary` is not enough.

- `tests/home-workspace.test.tsx`
  - Update integration assertions from `最新文章` to `科技热榜` and five category rankings.

- `tests/digest-workspace.test.tsx`
  - Replace NarroWorkspace homepage assertions with optional digest tool regression tests that match the new board layout.

- `README.md`
  - Align current status and usage steps with category ranking board.

- `docs/goal-handoff.md`
  - Update next goal handoff so future sessions execute this plan rather than the older source-first article list plan.

## Task 1: Build Category Board Helper

**Files:**
- Create: `lib/rankings/category-board.ts`
- Create: `tests/category-board.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `tests/category-board.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import type { Item, Source } from "@/lib/domain";
import { buildCategoryBoard, categoryDefinitions } from "@/lib/rankings/category-board";

function source(input: Partial<Source> & Pick<Source, "id" | "name" | "group">): Source {
  return {
    type: "rss",
    url: `https://example.com/${input.id}.xml`,
    enabled: true,
    refreshIntervalMinutes: 60,
    lastFetchedAt: "2026-05-28T02:00:00.000Z",
    failureCount: 0,
    healthStatus: "healthy",
    itemCount: 1,
    averageLatencyMs: 120,
    lastError: "",
    nextRefreshAt: "",
    unreadCount: 1,
    ...input
  };
}

function item(input: Partial<Item> & Pick<Item, "id" | "sourceId" | "title">): Item {
  return {
    url: `https://example.com/${input.id}`,
    author: "Fixture",
    publishedAt: "2026-05-28T01:00:00.000Z",
    fetchedAt: "2026-05-28T02:00:00.000Z",
    summary: "Fixture summary",
    aiSummary: "",
    language: "en",
    tags: [],
    entities: [],
    importanceScore: 70,
    readStatus: "unread",
    saved: false,
    hidden: false,
    reason: "test fixture",
    actionLabels: ["打开原文"],
    ...input
  };
}

const sources = [
  source({ id: "hugging-face-blog", name: "Hugging Face Blog", group: "模型厂商" }),
  source({ id: "hacker-news-rss", name: "Hacker News RSS", group: "社区讨论" }),
  source({ id: "react-blog", name: "React Blog", group: "工程技术" }),
  source({ id: "github-changelog", name: "GitHub Changelog", group: "产品更新" }),
  source({ id: "infoq-cn", name: "InfoQ 中文", group: "中文技术" })
];

describe("category board", () => {
  test("defines the five fixed technology categories in display order", () => {
    expect(categoryDefinitions.map((category) => category.id)).toEqual([
      "ai-models",
      "developer-community",
      "engineering-open-source",
      "product-platform",
      "chinese-tech"
    ]);
  });

  test("classifies items into the five main categories", () => {
    const board = buildCategoryBoard({
      items: [
        item({ id: "ai-1", sourceId: "hugging-face-blog", title: "New model release", tags: ["ai"] }),
        item({ id: "community-1", sourceId: "hacker-news-rss", title: "Show HN: developer tool" }),
        item({ id: "engineering-1", sourceId: "react-blog", title: "React compiler runtime update", tags: ["framework"] }),
        item({ id: "platform-1", sourceId: "github-changelog", title: "GitHub API changelog", tags: ["changelog"] }),
        item({ id: "zh-1", sourceId: "infoq-cn", title: "中文架构实践", language: "zh", tags: ["zh"] })
      ],
      sources
    });

    expect(board.categories.find((category) => category.id === "ai-models")?.items.map((entry) => entry.item.id)).toEqual(["ai-1"]);
    expect(board.categories.find((category) => category.id === "developer-community")?.items.map((entry) => entry.item.id)).toEqual(["community-1"]);
    expect(board.categories.find((category) => category.id === "engineering-open-source")?.items.map((entry) => entry.item.id)).toEqual(["engineering-1"]);
    expect(board.categories.find((category) => category.id === "product-platform")?.items.map((entry) => entry.item.id)).toEqual(["platform-1"]);
    expect(board.categories.find((category) => category.id === "chinese-tech")?.items.map((entry) => entry.item.id)).toEqual(["zh-1"]);
  });

  test("assigns each item to only one category using priority order", () => {
    const board = buildCategoryBoard({
      items: [
        item({
          id: "zh-ai",
          sourceId: "infoq-cn",
          title: "AI agent 中文实践",
          language: "zh",
          tags: ["zh", "ai"]
        })
      ],
      sources
    });

    const hits = board.categories.flatMap((category) => category.items.map((entry) => `${category.id}:${entry.item.id}`));
    expect(hits).toEqual(["chinese-tech:zh-ai"]);
  });

  test("filters hidden items and items whose source is missing", () => {
    const board = buildCategoryBoard({
      items: [
        item({ id: "visible", sourceId: "hacker-news-rss", title: "Visible community story" }),
        item({ id: "hidden", sourceId: "hacker-news-rss", title: "Hidden story", hidden: true }),
        item({ id: "missing-source", sourceId: "missing", title: "Missing source story" })
      ],
      sources
    });

    expect(board.totalItemCount).toBe(1);
    expect(board.categories.flatMap((category) => category.items.map((entry) => entry.item.id))).toEqual(["visible"]);
  });

  test("sorts by importance, published date, then title", () => {
    const board = buildCategoryBoard({
      items: [
        item({ id: "low", sourceId: "hacker-news-rss", title: "Low", importanceScore: 70, publishedAt: "2026-05-28T03:00:00.000Z" }),
        item({ id: "newer", sourceId: "hacker-news-rss", title: "Beta", importanceScore: 90, publishedAt: "2026-05-28T02:00:00.000Z" }),
        item({ id: "older-a", sourceId: "hacker-news-rss", title: "Alpha", importanceScore: 90, publishedAt: "2026-05-28T01:00:00.000Z" }),
        item({ id: "older-z", sourceId: "hacker-news-rss", title: "Zulu", importanceScore: 90, publishedAt: "2026-05-28T01:00:00.000Z" })
      ],
      sources
    });

    expect(board.categories.find((category) => category.id === "developer-community")?.items.map((entry) => entry.item.id)).toEqual([
      "newer",
      "older-a",
      "older-z",
      "low"
    ]);
  });

  test("limits each category to ten items and assigns one-based ranks", () => {
    const board = buildCategoryBoard({
      items: Array.from({ length: 12 }, (_, index) =>
        item({
          id: `hn-${index}`,
          sourceId: "hacker-news-rss",
          title: `Community story ${index}`,
          importanceScore: 100 - index
        })
      ),
      sources
    });

    const community = board.categories.find((category) => category.id === "developer-community");
    expect(community?.items).toHaveLength(10);
    expect(community?.items.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run:

```powershell
pnpm test tests/category-board.test.ts
```

Expected result: fails because `@/lib/rankings/category-board` does not exist.

- [ ] **Step 3: Implement the helper**

Create `lib/rankings/category-board.ts`:

```ts
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
```

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-board.test.ts
pnpm typecheck
```

Expected result: both commands pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/rankings/category-board.ts tests/category-board.test.ts
git commit -m "feat: build category ranking board data"
```

## Task 2: Build Ranking Card And Row Components

**Files:**
- Create: `components/rankings/category-ranking-row.tsx`
- Create: `components/rankings/category-ranking-card.tsx`
- Create: `tests/category-ranking-card.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/category-ranking-card.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CategoryRankingCard } from "@/components/rankings/category-ranking-card";
import type { CategoryRanking } from "@/lib/rankings/category-board";
import type { Item, Source } from "@/lib/domain";

const source: Source = {
  id: "hacker-news-rss",
  name: "Hacker News RSS",
  type: "rss",
  url: "https://news.ycombinator.com/rss",
  group: "社区讨论",
  enabled: true,
  refreshIntervalMinutes: 30,
  lastFetchedAt: "2026-05-28T02:00:00.000Z",
  failureCount: 0,
  healthStatus: "healthy",
  itemCount: 1,
  averageLatencyMs: 120,
  lastError: "",
  nextRefreshAt: "",
  unreadCount: 1
};

const item: Item = {
  id: "hn-1",
  sourceId: "hacker-news-rss",
  title: "Show HN: Fast AI coding workspace",
  url: "https://news.ycombinator.com/item?id=1",
  author: "Hacker News",
  publishedAt: "2026-05-28T01:00:00.000Z",
  fetchedAt: "2026-05-28T02:00:00.000Z",
  summary: "Developers discuss a fast local AI coding workspace with compact feedback loops.",
  aiSummary: "",
  language: "en",
  tags: ["community", "ai"],
  entities: ["Hacker News"],
  importanceScore: 91,
  readStatus: "unread",
  saved: false,
  hidden: false,
  reason: "test fixture",
  actionLabels: ["打开原文"]
};

const ranking: CategoryRanking = {
  id: "developer-community",
  title: "开发者社区",
  description: "Hacker News、Lobsters 等开发者社区高信号讨论",
  items: [{ item, source, rank: 1 }]
};

describe("category ranking card", () => {
  test("renders ranking metadata, row content, and article actions", () => {
    render(<CategoryRankingCard category={ranking} />);

    const card = screen.getByRole("region", { name: "开发者社区" });
    expect(within(card).getByRole("heading", { name: "开发者社区" })).toBeInTheDocument();
    expect(within(card).getByText("1 条")).toBeInTheDocument();
    expect(within(card).getByText("01")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Show HN: Fast AI coding workspace/ })).toHaveAttribute("href", item.url);
    expect(within(card).getByText("Hacker News RSS")).toBeInTheDocument();
    expect(within(card).getByText("2026/05/28")).toBeInTheDocument();
    expect(within(card).getByText(/Developers discuss/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /标记 .* 为已读/ })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /隐藏 .*/ })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "打开原文" })).toHaveAttribute("href", item.url);
  });

  test("renders empty state for a category with no items", () => {
    render(<CategoryRankingCard category={{ ...ranking, items: [] }} />);

    const card = screen.getByRole("region", { name: "开发者社区" });
    expect(within(card).getByText("0 条")).toBeInTheDocument();
    expect(within(card).getByText("暂无内容。点击获取最新信息后，这里会显示该分类的热榜。")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run:

```powershell
pnpm test tests/category-ranking-card.test.tsx
```

Expected result: fails because `CategoryRankingCard` does not exist.

- [ ] **Step 3: Implement `CategoryRankingRow`**

Create `components/rankings/category-ranking-row.tsx`:

```tsx
import { ArrowSquareOut, EyeSlash } from "@phosphor-icons/react/ssr";
import { updateItemStateAction } from "@/app/actions";
import type { RankedCategoryItem } from "@/lib/rankings/category-board";

interface CategoryRankingRowProps {
  entry: RankedCategoryItem;
}

export function CategoryRankingRow({ entry }: CategoryRankingRowProps) {
  const { item, rank, source } = entry;

  return (
    <article className="grid gap-2 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]" data-testid={categoryArticleDomId(item)} id={categoryArticleDomId(item)}>
      <span
        className={[
          "flex size-8 items-center justify-center rounded-md font-mono text-xs font-semibold",
          rank <= 3 ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"
        ].join(" ")}
      >
        {rank.toString().padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <a className="block underline-offset-2 hover:underline" href={item.url} rel="noreferrer" target="_blank">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.title}</h3>
        </a>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] leading-5 text-slate-500">
          <span>{source.name}</span>
          <span>{formatDate(item.publishedAt)}</span>
          <span className="font-mono text-teal-700">{item.importanceScore}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
      </div>

      <div className="flex items-start gap-1 sm:justify-end">
        <a
          aria-label="打开原文"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
          href={item.url}
          rel="noreferrer"
          target="_blank"
        >
          <ArrowSquareOut size={14} aria-hidden="true" />
          打开原文
        </a>
        <form action={updateItemStateAction}>
          <input name="itemId" type="hidden" value={item.id} />
          <input name="readStatus" type="hidden" value="read" />
          <button
            aria-label={`标记 ${item.title} 为已读`}
            className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
            type="submit"
          >
            已读
          </button>
        </form>
        <form action={updateItemStateAction}>
          <input name="itemId" type="hidden" value={item.id} />
          <input name="hidden" type="hidden" value="true" />
          <button
            aria-label={`隐藏 ${item.title}`}
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
            type="submit"
          >
            <EyeSlash size={14} aria-hidden="true" />
            隐藏
          </button>
        </form>
      </div>
    </article>
  );
}

export function categoryArticleDomId(item: { id: string }) {
  return `article-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
```

- [ ] **Step 4: Implement `CategoryRankingCard`**

Create `components/rankings/category-ranking-card.tsx`:

```tsx
import type { CategoryRanking } from "@/lib/rankings/category-board";
import { CategoryRankingRow } from "./category-ranking-row";

interface CategoryRankingCardProps {
  category: CategoryRanking;
  emptyMessage?: string;
}

export function CategoryRankingCard({
  category,
  emptyMessage = "暂无内容。点击获取最新信息后，这里会显示该分类的热榜。"
}: CategoryRankingCardProps) {
  return (
    <section aria-labelledby={`${category.id}-heading`} className="rounded-md border border-slate-200 bg-white p-4" role="region">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ranking</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-950" id={`${category.id}-heading`}>
            {category.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
          {category.items.length} 条
        </span>
      </div>

      {category.items.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {category.items.map((entry) => (
            <CategoryRankingRow entry={entry} key={entry.item.id} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-ranking-card.test.tsx
pnpm typecheck
```

Expected result: both commands pass.

- [ ] **Step 6: Commit**

```powershell
git add components/rankings/category-ranking-card.tsx components/rankings/category-ranking-row.tsx tests/category-ranking-card.test.tsx
git commit -m "feat: add category ranking cards"
```

## Task 3: Compose Category Board Workspace

**Files:**
- Create: `components/rankings/category-board-workspace.tsx`
- Create: `tests/category-board-workspace.test.tsx`

- [ ] **Step 1: Write failing workspace tests**

Create `tests/category-board-workspace.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CategoryBoardWorkspace } from "@/components/rankings/category-board-workspace";
import type { AgentTask, Item, Source } from "@/lib/domain";

function source(input: Partial<Source> & Pick<Source, "id" | "name" | "group">): Source {
  return {
    type: "rss",
    url: `https://example.com/${input.id}.xml`,
    enabled: true,
    refreshIntervalMinutes: 60,
    lastFetchedAt: "2026-05-28T02:00:00.000Z",
    failureCount: 0,
    healthStatus: "healthy",
    itemCount: 1,
    averageLatencyMs: 120,
    lastError: "",
    nextRefreshAt: "",
    unreadCount: 1,
    ...input
  };
}

function item(input: Partial<Item> & Pick<Item, "id" | "sourceId" | "title">): Item {
  return {
    url: `https://example.com/${input.id}`,
    author: "Fixture",
    publishedAt: "2026-05-28T01:00:00.000Z",
    fetchedAt: "2026-05-28T02:00:00.000Z",
    summary: "Fixture summary for the ranking board row.",
    aiSummary: "",
    language: "en",
    tags: [],
    entities: [],
    importanceScore: 80,
    readStatus: "unread",
    saved: false,
    hidden: false,
    reason: "test fixture",
    actionLabels: ["打开原文"],
    ...input
  };
}

const sources = [
  source({ id: "hugging-face-blog", name: "Hugging Face Blog", group: "模型厂商" }),
  source({ id: "hacker-news-rss", name: "Hacker News RSS", group: "社区讨论" }),
  source({ id: "react-blog", name: "React Blog", group: "工程技术" }),
  source({ id: "github-changelog", name: "GitHub Changelog", group: "产品更新" }),
  source({ id: "infoq-cn", name: "InfoQ 中文", group: "中文技术" })
];

const items = [
  item({ id: "ai-1", sourceId: "hugging-face-blog", title: "New model release", tags: ["ai"], importanceScore: 92 }),
  item({ id: "community-1", sourceId: "hacker-news-rss", title: "Show HN: developer tool", importanceScore: 91 }),
  item({ id: "engineering-1", sourceId: "react-blog", title: "React compiler runtime update", tags: ["framework"], importanceScore: 88 }),
  item({ id: "platform-1", sourceId: "github-changelog", title: "GitHub API changelog", tags: ["changelog"], importanceScore: 87 }),
  item({ id: "zh-1", sourceId: "infoq-cn", title: "中文架构实践", language: "zh", tags: ["zh"], importanceScore: 86 })
];

const digestTask: AgentTask = {
  id: "digest-1",
  type: "daily_brief",
  title: "生成今日简报",
  description: "基于当前 Lens 生成可回链的本地简报。",
  lensId: "ai-coding",
  status: "completed",
  input: JSON.stringify({
    kind: "tech_digest",
    label: "今日科技简报",
    mode: "local",
    referenceItemIds: ["ai-1"]
  }),
  output: "## 今日重点\n- [1] New model release 值得关注。",
  createdAt: "2026-05-28T02:00:00.000Z",
  updatedAt: "2026-05-28T02:00:00.000Z",
  primary: true
};

describe("category board workspace", () => {
  test("renders the technology ranking board and five category cards", () => {
    render(<CategoryBoardWorkspace agentTasks={[digestTask]} items={items} settings={{}} sources={sources} />);

    const main = screen.getByRole("main", { name: "科技热榜" });
    expect(within(main).getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "科技热榜" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "AI / 模型" })).toHaveAttribute("href", "#ai-models");
    expect(within(main).getByRole("link", { name: "开发者社区" })).toHaveAttribute("href", "#developer-community");
    expect(within(main).getByRole("link", { name: "工程 / 开源" })).toHaveAttribute("href", "#engineering-open-source");
    expect(within(main).getByRole("link", { name: "产品 / 平台" })).toHaveAttribute("href", "#product-platform");
    expect(within(main).getByRole("link", { name: "中文技术" })).toHaveAttribute("href", "#chinese-tech");
    expect(within(main).getByRole("region", { name: "AI / 模型" })).toHaveTextContent("New model release");
    expect(within(main).getByRole("region", { name: "开发者社区" })).toHaveTextContent("Show HN: developer tool");
    expect(within(main).getByRole("region", { name: "工程 / 开源" })).toHaveTextContent("React compiler runtime update");
    expect(within(main).getByRole("region", { name: "产品 / 平台" })).toHaveTextContent("GitHub API changelog");
    expect(within(main).getByRole("region", { name: "中文技术" })).toHaveTextContent("中文架构实践");
  });

  test("keeps digest tools after the ranking board", () => {
    render(<CategoryBoardWorkspace agentTasks={[digestTask]} items={items} settings={{}} sources={sources} />);

    const rankingHeading = screen.getByRole("heading", { name: "科技热榜" });
    const digestHeading = screen.getByRole("heading", { name: "今日科技简报" });
    const position = rankingHeading.compareDocumentPosition(digestHeading);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
    expect(screen.getByText("AI 设置")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看引用 1" })).toHaveAttribute("href", "#article-ai-1");
  });

  test("renders all category cards with empty states when no articles exist", () => {
    render(<CategoryBoardWorkspace agentTasks={[]} items={[]} settings={{}} sources={sources} />);

    expect(screen.getAllByText("暂无内容。点击获取最新信息后，这里会显示该分类的热榜。")).toHaveLength(5);
    expect(screen.getByText("还没有生成简报。")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx
```

Expected result: fails because `CategoryBoardWorkspace` does not exist.

- [ ] **Step 3: Implement the workspace**

Create `components/rankings/category-board-workspace.tsx`:

```tsx
import type { AgentTask, Item, Source } from "@/lib/domain";
import { selectDigestEntries } from "@/lib/digest/source-pack";
import { parseDigestTaskMode, parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import { DigestActionPanel } from "@/components/digest/digest-action-panel";
import { DigestCard } from "@/components/digest/digest-card";
import { ModelSettingsForm } from "@/components/digest/model-settings-form";
import { SourceRefreshPanel } from "@/components/digest/source-refresh-panel";
import { buildCategoryBoard } from "@/lib/rankings/category-board";
import { CategoryRankingCard } from "./category-ranking-card";
import { categoryArticleDomId } from "./category-ranking-row";

interface CategoryBoardWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function CategoryBoardWorkspace({ agentTasks, items, settings, sources }: CategoryBoardWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const digestMode = latestDigest ? parseDigestTaskMode(latestDigest.input) : undefined;
  const storedReferenceItemIds = latestDigest ? parseDigestTaskReferenceIds(latestDigest.input) : [];
  const storedReferenceItems = itemsFromStoredReferenceIds(items, storedReferenceItemIds);
  const selectedReferenceItems = selectDigestEntries({ items, sources }).map((entry) => entry.item);
  const referenceItems = storedReferenceItemIds.length > 0 ? storedReferenceItems : selectedReferenceItems;
  const boardItems = uniqueItemsById([...items, ...referenceItems]);
  const board = buildCategoryBoard({ items: boardItems, sources });
  const renderedItemIds = new Set(board.categories.flatMap((category) => category.items.map((entry) => entry.item.id)));
  const citationHrefs = new Map(
    referenceItems.flatMap((item, index) =>
      renderedItemIds.has(item.id) ? ([[index + 1, `#${categoryArticleDomId(item)}`]] as Array<[number, string]>) : []
    )
  );

  return (
    <main aria-label="科技热榜" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <SourceRefreshPanel />

      <section className="rounded-md border border-slate-200 bg-white p-4" aria-labelledby="ranking-board-heading">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">TopHub-style board</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950" id="ranking-board-heading">
              科技热榜
            </h1>
            <p className="mt-2 max-w-[72ch] text-sm leading-6 text-slate-600">
              按 AI、社区、工程、平台和中文技术聚合已抓取文章，先扫榜单，再打开原文。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.totalItemCount} 条上榜</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.updatedSourceCount} 个源已更新</span>
          </div>
        </div>

        <nav aria-label="热榜分类" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {board.categories.map((category) => (
            <a
              className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:bg-white active:translate-y-px"
              href={`#${category.id}`}
              key={category.id}
            >
              {category.title}
            </a>
          ))}
        </nav>
      </section>

      <section aria-label="分类榜单" className="grid gap-3 lg:grid-cols-2">
        {board.categories.map((category) => (
          <div id={category.id} key={category.id}>
            <CategoryRankingCard category={category} />
          </div>
        ))}
      </section>

      <section aria-label="简报工具" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DigestCard citationHrefs={citationHrefs} latestDigest={latestDigest} mode={digestMode} referenceItems={referenceItems} />
        <div className="grid content-start gap-3">
          <DigestActionPanel />
          <ModelSettingsForm settings={settings} />
        </div>
      </section>
    </main>
  );
}

function itemsFromStoredReferenceIds(items: Item[], referenceItemIds: string[]): Item[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return referenceItemIds.map((itemId) => itemById.get(itemId)).filter((item): item is Item => Boolean(item));
}

function uniqueItemsById(items: Item[]): Item[] {
  const seen = new Set<string>();
  const result: Item[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}
```

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx tests/category-ranking-card.test.tsx tests/category-board.test.ts
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 5: Commit**

```powershell
git add components/rankings/category-board-workspace.tsx tests/category-board-workspace.test.tsx
git commit -m "feat: compose category ranking workspace"
```

## Task 4: Wire Homepage To Ranking Board

**Files:**
- Modify: `components/app-shell/narro-workspace.tsx`
- Modify: `components/app-shell/top-bar.tsx`
- Modify: `tests/home-workspace.test.tsx`
- Modify: `tests/digest-workspace.test.tsx`

- [ ] **Step 1: Update homepage integration tests first**

Modify `tests/home-workspace.test.tsx` so the first test asserts category board copy instead of the old article-list heading:

```tsx
expect(screen.getByRole("main", { name: "科技热榜" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
expect(screen.getByText("AI 设置")).toBeInTheDocument();
expect(screen.queryByText("模型设置")).not.toBeInTheDocument();
expect(screen.getByRole("heading", { name: "科技热榜" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "AI / 模型" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "开发者社区" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "工程 / 开源" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "产品 / 平台" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "中文技术" })).toBeInTheDocument();
expect(screen.queryByText("最新文章")).not.toBeInTheDocument();
expect(screen.queryByText("引用文章")).not.toBeInTheDocument();
```

Modify the persisted settings test in the same file:

```tsx
const main = screen.getByRole("main", { name: "科技热榜" });
const aiSettings = within(main).getByText("AI 设置");
expect(aiSettings).toBeInTheDocument();
expect(within(main).queryByDisplayValue("https://api.example.com/v1")).not.toBeInTheDocument();
expect(within(main).getByRole("link", { name: /Show HN: Fast local AI coding workspace/ })).toHaveAttribute(
  "href",
  "https://example.com/fast-local-ai-coding"
);
```

- [ ] **Step 2: Update workspace tests that currently expect `最新文章`**

In `tests/digest-workspace.test.tsx`, replace NarroWorkspace homepage assertions with category board assertions:

```tsx
const main = screen.getByRole("main", { name: "科技热榜" });
expect(within(main).getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
expect(within(main).getByRole("heading", { name: "科技热榜" })).toBeInTheDocument();
expect(within(main).getByRole("region", { name: "开发者社区" })).toHaveTextContent("Show HN: Fast AI coding workspace");
expect(within(main).getByRole("button", { name: /标记 .* 为已读/ })).toBeInTheDocument();
expect(within(main).getByRole("button", { name: /隐藏 .*/ })).toBeInTheDocument();
expect(within(main).queryByRole("heading", { name: "最新文章" })).not.toBeInTheDocument();
```

Update the document-order test:

```tsx
const rankingHeading = screen.getByRole("heading", { name: "科技热榜" });
const digestHeading = screen.getByRole("heading", { name: "今日科技简报" });
const position = rankingHeading.compareDocumentPosition(digestHeading);
expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

Update any main landmark lookup from `今日科技信息` to `科技热榜`.

- [ ] **Step 3: Run tests and verify they fail before wiring**

Run:

```powershell
pnpm test tests/home-workspace.test.tsx tests/digest-workspace.test.tsx
```

Expected result: fails because `NarroWorkspace` still renders `DigestWorkspace`.

- [ ] **Step 4: Wire `NarroWorkspace` to the new workspace**

Modify `components/app-shell/narro-workspace.tsx`:

```tsx
import type {
  AgentTask,
  Item,
  Source,
  WorkspaceSummary
} from "@/lib/domain";
import { CategoryBoardWorkspace } from "@/components/rankings/category-board-workspace";
import { TopBar } from "./top-bar";

interface NarroWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  searchQuery?: string;
  settings: Record<string, string>;
  sources: Source[];
  summary: WorkspaceSummary;
}

export function NarroWorkspace({
  agentTasks,
  items,
  searchQuery,
  settings,
  sources,
  summary
}: NarroWorkspaceProps) {
  return (
    <div className="min-h-[100dvh] px-3 py-3 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <TopBar searchQuery={searchQuery} summary={summary} />

        <div className="overflow-hidden rounded-md border border-slate-300/80 bg-slate-300/80">
          <CategoryBoardWorkspace agentTasks={agentTasks} items={items} settings={settings} sources={sources} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `TopBar` subtitle**

In `components/app-shell/top-bar.tsx`, replace:

```tsx
<p className="truncate text-[11px] leading-tight text-slate-300">今日科技简报</p>
```

with:

```tsx
<p className="truncate text-[11px] leading-tight text-slate-300">科技热榜</p>
```

Update tests that assert the banner subtitle:

```tsx
expect(banner).toHaveTextContent("科技热榜");
```

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/home-workspace.test.tsx tests/digest-workspace.test.tsx tests/category-board-workspace.test.tsx
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 7: Commit**

```powershell
git add components/app-shell/narro-workspace.tsx components/app-shell/top-bar.tsx tests/home-workspace.test.tsx tests/digest-workspace.test.tsx
git commit -m "feat: make homepage a category ranking board"
```

## Task 5: Preserve Refresh And Digest Regressions

**Files:**
- Modify: `tests/source-refresh-panel.test.tsx`
- Modify: `tests/digest-action.test.ts`
- Modify: `tests/digest-action-panel.test.tsx`
- Modify only if needed: `components/rankings/category-board-workspace.tsx`

- [ ] **Step 1: Run existing refresh and digest action tests**

Run:

```powershell
pnpm test tests/source-refresh-panel.test.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx
```

Expected result: tests pass. If they fail because copy changed in the new board, adjust only the assertions that refer to visible page ordering. Do not remove source-level refresh detail assertions.

- [ ] **Step 2: Add regression assertion for refresh panel location**

In `tests/category-board-workspace.test.tsx`, add:

```tsx
test("shows refresh controls before category rankings", () => {
  render(<CategoryBoardWorkspace agentTasks={[]} items={items} settings={{}} sources={sources} />);

  const refreshButton = screen.getByRole("button", { name: "获取最新信息" });
  const rankingHeading = screen.getByRole("heading", { name: "科技热榜" });
  const position = refreshButton.compareDocumentPosition(rankingHeading);

  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

- [ ] **Step 3: Run focused regression tests**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx tests/source-refresh-panel.test.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 4: Commit if files changed**

If Step 2 added the regression test, run:

```powershell
git add tests/category-board-workspace.test.tsx
git commit -m "test: preserve ranking board refresh flow"
```

If no files changed, do not create a commit.

## Task 6: Update Product Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/goal-handoff.md`

- [ ] **Step 1: Update README current status**

In `README.md`, replace the current status paragraph with:

```md
当前状态：Narro 当前主路径是“大分类科技热榜”。首页会刷新固定默认科技源，把已抓取文章按 `AI / 模型`、`开发者社区`、`工程 / 开源`、`产品 / 平台`、`中文技术` 五个分类展示为榜单；用户可以快速扫标题、来源、发布时间和摘要，并打开原文、标记已读、隐藏噪声文章。生成今日科技简报仍然可用，但属于榜单墙之后的可选增强；未配置模型时会使用本地 fallback 简报。OpenAI-compatible 模型设置收在“AI 设置”中，不是首次使用前提。
```

- [ ] **Step 2: Update README core direction**

Replace the `核心方向` bullets with:

```md
## 核心方向

- 当前首页主体验是“按大分类浏览科技热榜”。
- 默认科技源保持固定、小而稳定，不追求源数量。
- 榜单先按轻量热度排序：重要性分数优先，发布时间兜底。
- 原始文章和原文链接是基础产品能力，摘要和 AI 简报是增强能力。
- 模型不可用时也要能刷新文章、浏览榜单、打开原文、生成本地简报。
- Lens、源管理、Agent 侧栏、事件组、OPML 等功能暂时不作为首页主功能。
```

- [ ] **Step 3: Update README usage steps**

Replace the MVP usage steps with:

```md
## MVP 使用方式

1. 打开 `http://localhost:3001`。
2. 点击“获取最新信息”，Narro 会刷新默认科技源。
3. 在“科技热榜”中按 `AI / 模型`、`开发者社区`、`工程 / 开源`、`产品 / 平台`、`中文技术` 浏览分类榜单。
4. 在榜单行中阅读标题、摘要、来源和发布时间，按需打开原文。
5. 对已读或噪声文章使用“已读”和“隐藏”。
6. 需要摘要时点击“生成今日科技简报”；没有模型配置也会生成本地 fallback 简报。
7. 需要 AI 简报时展开“AI 设置”，填写 OpenAI-compatible `Base URL`、`Model` 和 `API Key`。
```

- [ ] **Step 4: Update goal handoff**

In `docs/goal-handoff.md`, replace project status with:

```md
Narro 当前主路径是“大分类科技热榜”。首页只保留基础功能产品路径：获取最新信息、按五个科技分类浏览榜单、打开原文、标记已读、隐藏噪声文章，以及可选生成今日科技简报。
```

Replace execution constraints with:

```md
- 优先完成主功能：获取、分类榜单、打开原文、已读、隐藏。
- 简报和 AI 模型设置是增强能力，不要压过分类榜单。
- 不讨论部署、迁移、维护作为当前缺口。
- 不扩大到 Source Directory、Lens 编辑器、语义搜索、聊天问答。
- 每个任务完成后运行对应测试。
```

- [ ] **Step 5: Verify docs do not describe stale homepage features as current**

Run:

```powershell
rg -n "当前首页主体验是“获取最新信息并阅读源文章”|最新文章|引用文章|首页主路径是“今日科技简报”|信息源和视角|Agent 任务|事件组与趋势|OPML|高级筛选" README.md docs/goal-handoff.md
```

Expected result: no matches for current-product descriptions. Matches are acceptable only if they explicitly appear in out-of-scope statements; if matches are ambiguous, reword them.

- [ ] **Step 6: Commit**

```powershell
git add README.md docs/goal-handoff.md
git commit -m "docs: describe category ranking homepage"
```

## Task 7: Full Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Run focused test set**

Run:

```powershell
pnpm test tests/category-board.test.ts tests/category-ranking-card.test.tsx tests/category-board-workspace.test.tsx tests/source-refresh-panel.test.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
```

Expected result: all listed tests pass.

- [ ] **Step 2: Run full validation**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected result:

- `pnpm lint` exits 0.
- `pnpm typecheck` exits 0.
- `pnpm test` exits 0.
- `pnpm build` exits 0.

- [ ] **Step 3: Confirm old homepage UI is not mounted**

Run:

```powershell
rg -n "SourceLensSidebar|AgentSidebar|FeedWorkspace|source-lens-sidebar|agent-sidebar|feed-workspace|信息源和视角|Agent 任务|事件组与趋势|OPML|高级筛选" app components/app-shell components/digest components/rankings
```

Expected result: no matches in `app`, `components/app-shell`, `components/digest`, or `components/rankings` that indicate mounted homepage UI. Imports or files outside these paths are not part of this check.

- [ ] **Step 4: Inspect final diff and commits**

Run:

```powershell
git status --short --branch
git log --oneline -8
```

Expected result:

- Worktree is clean except intentional local-only files such as `.superpowers/`.
- Recent commits show category board data, components, workspace wiring, tests/docs, and final verification if a final verification commit was needed.

## Execution Handoff Prompt

Use this prompt in a new conversation to execute this plan:

```text
请在 D:\Study\project\agent\narro 继续。

请直接执行实现文档：
docs/superpowers/plans/2026-05-29-category-ranking-board.md

重要约束：
- 不要重新 brainstorming。
- 不要重新改产品方向。
- 按计划任务顺序执行。
- 使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务提交一次。
- 不要恢复旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build。
```

## Acceptance Criteria

The implementation is complete when all of these are true:

- Homepage main landmark is `科技热榜`.
- First visible product path is category rankings, not digest output or old workbench UI.
- Fixed categories render in this order: `AI / 模型`, `开发者社区`, `工程 / 开源`, `产品 / 平台`, `中文技术`.
- Each category shows at most 10 ranked items.
- Ranking order uses `importanceScore desc`, then `publishedAt desc`, then `title asc`.
- Hidden items do not enter rankings.
- Items with missing source are skipped.
- Ranking rows show rank, title, source, date, importance score, summary, open-original link, read action, and hide action.
- `获取最新信息` still works through the existing source refresh action and source-level detail UI.
- `生成今日科技简报`, digest display, copy button, citations, and `AI 设置` remain available after the board.
- Old Source/Lens/Agent/Event/OPML/advanced-filter UI is not mounted on the homepage.
- No database schema changes are introduced.
- No TopHub scraping or third-party page parsing is introduced.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## Plan Self-Review

- Spec coverage: Tasks cover the pure ranking helper, category card UI, workspace composition, homepage wiring, refresh/digest regressions, docs, and final verification.
- Scope check: The plan stays within the category ranking board homepage. It does not introduce schema changes, new source management, background jobs, Lens editing, OPML, Agent sidebars, or TopHub scraping.
- Type consistency: The plan uses `CategoryId`, `CategoryBoard`, `CategoryRanking`, `RankedCategoryItem`, `buildCategoryBoard`, `CategoryBoardWorkspace`, `CategoryRankingCard`, `CategoryRankingRow`, and `categoryArticleDomId` consistently across tests and implementation snippets.
- Test coverage: Unit tests cover classification, priority, sorting, hidden filtering, missing source handling, and limits. Component tests cover ranking rows/cards, workspace layout, refresh control placement, digest placement, and homepage integration.
