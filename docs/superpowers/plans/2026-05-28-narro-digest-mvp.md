# Narro Digest MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Narro into a basic usable tech digest product: one primary action fetches current tech items, generates a readable Chinese digest, and shows linked source articles on a simplified page.

**Architecture:** Keep the existing Next.js, SQLite/libSQL, Source Adapter, Item, and AgentTask foundation. Add a focused digest layer on top of the existing ingestion and LLM code instead of expanding Lens, event grouping, source management, or deployment features. Simplify the homepage so the primary path is visible: configure model, generate digest, read digest, open referenced articles.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Server Actions, TypeScript 6, Tailwind CSS 4, Vitest, existing libSQL/Drizzle setup, existing OpenAI-compatible LLM adapter.

---

## Product Scope

This phase deliberately ignores deployment, migrations, multi-user concerns, long-term background jobs, source governance, and advanced agent workflows.

The only success path for this phase:

1. User opens `/`.
2. User sees a simple page centered on "今日科技简报".
3. User can configure OpenAI-compatible `baseUrl`, `model`, and `apiKey` from the page.
4. User clicks "生成今日科技简报".
5. Narro refreshes a small stable source pack.
6. Narro selects recent high-signal items.
7. Narro generates a Chinese digest in sections.
8. Narro shows the digest as the main content.
9. Narro shows referenced articles below the digest with source name and original links.

## Reference From `tech-news-digest`

The useful idea from `4uffin/auto-news-aggregator` is not its UI or automation. The useful idea is its narrow product loop:

- Fixed small source list.
- Pull recent headlines from each source.
- Batch the fetched headlines into one LLM request.
- Ask for a concise, categorized digest.
- Save and display the digest.

Narro should copy that product shape, but adapt it to the current app:

- Use the existing source presets and RSS/API adapters.
- Use current `Item` records instead of raw text-only headlines.
- Keep original links and source references.
- Do not add web scraping fallback.
- Do not require GitHub Actions for the basic product.

## Page Simplification

### Keep

- Brand/header.
- One search input for already-fetched articles only.
- One primary button: "生成今日科技简报".
- Compact model settings needed to make digest generation work.
- Digest output.
- Referenced article list.
- Minimal refresh/result status.

### Remove From Main Page For This Phase

Remove these from the rendered homepage. Existing backend code can remain unless it blocks the new UX.

- Left source/lens sidebar.
- Source health panel.
- Refresh log panel.
- Source quality panel.
- Add RSS form.
- OPML import/export controls.
- Lens list and Lens settings form.
- Feed view pills: latest/saved/reading/unread/hidden.
- Advanced filters: entity, tag, min importance, since.
- Batch "全部标为已读".
- Event groups and event detail panel.
- Item detail panel controlled by query string.
- Per-item save/read/hide buttons.
- Right Agent task sidebar.
- Data source roadmap panel.
- Fake "direct ask" copy in the top search placeholder.

### Keep Available But Not Visible

These functions remain useful later and should not be deleted in this phase:

- `refreshSource`, `refreshEnabledSources`, `refreshDueSources`.
- Existing RSS/Atom and HN API adapters.
- Existing source presets.
- Existing `AgentTask` persistence.
- Existing item state fields.

---

## File Structure

### Create

- `lib/digest/types.ts`
  - Digest-specific types for UI and actions.
- `lib/digest/source-pack.ts`
  - Defines the small default source pack and item selection rules.
- `lib/digest/generator.ts`
  - Builds digest prompts, calls the existing LLM adapter, and provides a deterministic fallback digest.
- `components/digest/digest-workspace.tsx`
  - New simplified homepage main component.
- `components/digest/digest-card.tsx`
  - Renders the latest digest output.
- `components/digest/digest-action-panel.tsx`
  - Client component for the generate button and action state.
- `components/digest/model-settings-form.tsx`
  - Compact model settings form.
- `components/digest/article-list.tsx`
  - Renders referenced source articles with original links.
- `tests/digest-generator.test.ts`
  - Unit coverage for prompt, fallback digest, references, and no-item state.
- `tests/digest-workspace.test.tsx`
  - UI coverage for the simplified page.
- `tests/digest-action.test.ts`
  - Server-action level test for refresh plus digest generation.

### Modify

- `app/page.tsx`
  - Stop parsing advanced query params.
  - Load digest workspace data.
- `app/actions.ts`
  - Add `generateTechDigestAction`.
  - Extend model settings to save local API key.
- `components/app-shell/narro-workspace.tsx`
  - Replace three-column shell with simplified digest workspace shell.
- `components/app-shell/top-bar.tsx`
  - Remove direct-question copy and secondary metrics that are not part of the digest path.
- `lib/agent/llm.ts`
  - Improve the daily digest prompt format.
  - Read API key from settings when supplied.
- `lib/db/repositories.ts`
  - Add helpers to list unfiltered recent digest items and persist digest outputs through existing `agent_tasks`.
- `lib/domain.ts`
  - Add `DigestActionState`.
- `tests/home-workspace.test.tsx`
  - Replace old "M0 workspace has everything" assertions with simplified digest UI assertions.

### Delete Or Stop Importing

Do not start by deleting these files. First stop importing them from the homepage and update tests. Delete only after the simplified page passes and no imports remain.

- `components/navigation/source-lens-sidebar.tsx`
- `components/agent-tasks/agent-sidebar.tsx`

---

## Digest Behavior

### Source Pack

Use a fixed first-pass source pack:

```ts
export const techDigestSourceIds = [
  "hacker-news-rss",
  "lobsters-rss",
  "hugging-face-blog",
  "google-ai-blog",
  "aws-machine-learning-blog",
  "ollama-blog",
  "ruanyifeng-weekly",
  "infoq-cn"
] as const;
```

Do not include slow or unstable sources in the primary path unless they are already fetched. `arxiv-*` and `cloudflare-blog` can remain available but should not block the digest button.

### Item Selection

Select at most 32 items for the LLM:

- Recent first.
- Hidden items excluded.
- Prefer enabled digest source pack.
- Sort by `importanceScore`, then `publishedAt`.
- Cap each source at 5 items so one feed cannot dominate.
- Do not apply Lens filters to digest generation. Lens can return later, but the basic digest should summarize the default technology source pack.

### Digest Format

The LLM output should be Chinese and concise:

```text
## 今日重点
- [1] ...
- [2] ...

## AI 与开发工具
- [3] ...

## 平台与产品变化
- [4] ...

## 值得继续跟踪
- [5] ...
```

Requirements:

- 3 to 5 sections.
- 6 to 10 bullets total.
- Every bullet should cite one or more numeric references like `[1]`.
- No unsupported claims beyond provided items.
- Merge duplicate or highly similar stories.
- Mention why the item matters.

### Fallback Digest

If LLM is not configured or fails, generate a deterministic local digest from the top items:

```text
## 今日重点
- [1] <title>。来源：<source>。
- [2] <title>。来源：<source>。

## 可继续阅读
- [3] <title>。
```

This fallback must still make the product usable and must not show an empty agent task card.

---

## Task 1: Digest Types And Generator

**Files:**
- Create: `lib/digest/types.ts`
- Create: `lib/digest/generator.ts`
- Test: `tests/digest-generator.test.ts`

- [ ] **Step 1: Write failing tests for prompt and fallback digest**

Create `tests/digest-generator.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import type { Item, Source } from "@/lib/domain";
import { buildDigestPrompt, generateDigestFromItems } from "@/lib/digest/generator";

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
  summary: "Developers discuss a fast local AI coding workspace.",
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

describe("digest generator", () => {
  test("builds a Chinese digest prompt with numbered references", () => {
    const prompt = buildDigestPrompt([{ item, source }]);

    expect(prompt).toContain("中文科技简报");
    expect(prompt).toContain("[1]");
    expect(prompt).toContain("Show HN: Fast AI coding workspace");
    expect(prompt).toContain("必须引用编号");
  });

  test("returns deterministic fallback digest when LLM is not configured", async () => {
    const result = await generateDigestFromItems({
      entries: [{ item, source }],
      settings: {},
      llmOptions: {}
    });

    expect(result.status).toBe("completed");
    expect(result.usedFallback).toBe(true);
    expect(result.output).toContain("## 今日重点");
    expect(result.output).toContain("[1] Show HN: Fast AI coding workspace");
    expect(result.references).toEqual([{ index: 1, itemId: "hn-1" }]);
  });

  test("uses configured LLM output when settings and API key are present", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "## 今日重点\n- [1] AI coding workspace 正在升温。" } }]
        }),
        { status: 200 }
      )
    );

    const result = await generateDigestFromItems({
      entries: [{ item, source }],
      settings: {
        provider: "openai-compatible",
        baseUrl: "https://llm.example.com/v1",
        model: "test-model",
        apiKey: "test-key"
      },
      llmOptions: { fetcher }
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.usedFallback).toBe(false);
    expect(result.output).toContain("## 今日重点");
    expect(result.references).toEqual([{ index: 1, itemId: "hn-1" }]);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test tests/digest-generator.test.ts
```

Expected result: fail because `lib/digest/generator.ts` does not exist.

- [ ] **Step 3: Implement digest types**

Create `lib/digest/types.ts`:

```ts
import type { AgentTaskStatus, Item, Source } from "@/lib/domain";
import type { LlmRunOptions } from "@/lib/agent/llm";

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
```

- [ ] **Step 4: Implement generator**

Create `lib/digest/generator.ts`:

```ts
import { llmIsConfigured, runOpenAiCompatibleTask } from "@/lib/agent/llm";
import type { DigestEntry, DigestReference, GenerateDigestInput, GenerateDigestResult } from "./types";

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
```

- [ ] **Step 5: Run the test**

Run:

```powershell
pnpm test tests/digest-generator.test.ts
```

Expected result: pass.

---

## Task 2: Source Pack And Item Selection

**Files:**
- Create: `lib/digest/source-pack.ts`
- Test: `tests/digest-generator.test.ts`

- [ ] **Step 1: Add failing tests for source pack selection**

Add this import at the top of `tests/digest-generator.test.ts`:

```ts
import { selectDigestEntries, techDigestSourceIds } from "@/lib/digest/source-pack";
```

Then append these tests after the existing `describe("digest generator", ...)` block:

```ts
test("uses a small stable tech digest source pack", () => {
  expect(techDigestSourceIds).toEqual([
    "hacker-news-rss",
    "lobsters-rss",
    "hugging-face-blog",
    "google-ai-blog",
    "aws-machine-learning-blog",
    "ollama-blog",
    "ruanyifeng-weekly",
    "infoq-cn"
  ]);
});

test("selects recent high-signal entries and caps each source", () => {
  const sources = [source];
  const items = Array.from({ length: 8 }, (_, index) => ({
    ...item,
    id: `hn-${index}`,
    title: `Story ${index}`,
    importanceScore: 90 - index,
    publishedAt: `2026-05-28T0${index}:00:00.000Z`
  }));

  const selected = selectDigestEntries({ items, sources, maxEntries: 32, maxPerSource: 5 });

  expect(selected).toHaveLength(5);
  expect(selected[0].item.title).toBe("Story 0");
  expect(selected.every((entry) => entry.source.id === "hacker-news-rss")).toBe(true);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test tests/digest-generator.test.ts
```

Expected result: fail because `lib/digest/source-pack.ts` does not exist.

- [ ] **Step 3: Implement source pack selection**

Create `lib/digest/source-pack.ts`:

```ts
import type { Item, Source } from "@/lib/domain";
import type { DigestEntry } from "./types";

export const techDigestSourceIds = [
  "hacker-news-rss",
  "lobsters-rss",
  "hugging-face-blog",
  "google-ai-blog",
  "aws-machine-learning-blog",
  "ollama-blog",
  "ruanyifeng-weekly",
  "infoq-cn"
] as const;

const digestSourceSet = new Set<string>(techDigestSourceIds);

interface SelectDigestEntriesOptions {
  items: Item[];
  maxEntries?: number;
  maxPerSource?: number;
  sources: Source[];
}

export function selectDigestEntries({
  items,
  maxEntries = 32,
  maxPerSource = 5,
  sources
}: SelectDigestEntriesOptions): DigestEntry[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const countBySource = new Map<string, number>();
  const selected: DigestEntry[] = [];

  const candidates = items
    .filter((item) => !item.hidden)
    .filter((item) => digestSourceSet.has(item.sourceId))
    .sort((left, right) => {
      const importanceDelta = right.importanceScore - left.importanceScore;
      if (importanceDelta !== 0) return importanceDelta;
      return new Date(right.publishedAt).valueOf() - new Date(left.publishedAt).valueOf();
    });

  for (const item of candidates) {
    const source = sourceById.get(item.sourceId);
    if (!source) continue;

    const count = countBySource.get(item.sourceId) ?? 0;
    if (count >= maxPerSource) continue;

    selected.push({ item, source });
    countBySource.set(item.sourceId, count + 1);

    if (selected.length >= maxEntries) break;
  }

  return selected;
}
```

- [ ] **Step 4: Run digest tests**

Run:

```powershell
pnpm test tests/digest-generator.test.ts
```

Expected result: pass.

---

## Task 3: Generate Digest Server Action

**Files:**
- Modify: `app/actions.ts`
- Modify: `lib/agent/llm.ts`
- Modify: `lib/db/repositories.ts`
- Modify: `lib/domain.ts`
- Test: `tests/digest-action.test.ts`

- [ ] **Step 1: Write failing action test**

Create `tests/digest-action.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { NarroDatabase } from "@/lib/db/client";
import { closeDatabase, createDatabase, initializeDatabase, resetDatabase } from "@/lib/db/client";
import { insertItemIfNew, listAgentTasks, prepareDatabase, saveSetting } from "@/lib/db/repositories";
import { generateTechDigestForDatabase } from "@/app/actions";

const rssDate = "2026-05-28T02:00:00.000Z";

describe("digest generation action", () => {
  let database: NarroDatabase;

  beforeEach(async () => {
    database = createDatabase("file::memory:");
    await initializeDatabase(database);
    await prepareDatabase(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await closeDatabase(database);
  });

  test("generates and persists a digest from existing items", async () => {
    await insertItemIfNew(
      database,
      {
        id: "digest-hn-1",
        sourceId: "hacker-news-rss",
        title: "Show HN: AI coding browser",
        url: "https://news.ycombinator.com/item?id=100",
        author: "Hacker News",
        publishedAt: rssDate,
        fetchedAt: rssDate,
        summary: "Developers discuss an AI coding browser.",
        aiSummary: "",
        language: "en",
        tags: ["community", "ai"],
        entities: ["Hacker News"],
        importanceScore: 90,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "test fixture",
        actionLabels: ["打开原文"]
      },
      "digest-hn-1"
    );

    const result = await generateTechDigestForDatabase(database, {
      refresh: false
    });
    const tasks = await listAgentTasks(database, { lensId: "ai-coding", limit: 10 });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("已生成");
    expect(result.digestOutput).toContain("Show HN: AI coding browser");
    expect(tasks.some((task) => task.type === "daily_brief" && task.output?.includes("Show HN"))).toBe(true);
  });

  test("uses LLM settings including locally saved API key", async () => {
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://llm.example.com/v1");
    await saveSetting(database, "llm.model", "test-model");
    await saveSetting(database, "llm.apiKey", "test-key");

    await insertItemIfNew(
      database,
      {
        id: "digest-hn-2",
        sourceId: "hacker-news-rss",
        title: "OpenAI releases coding agent update",
        url: "https://news.ycombinator.com/item?id=101",
        author: "Hacker News",
        publishedAt: rssDate,
        fetchedAt: rssDate,
        summary: "A coding agent update is discussed by developers.",
        aiSummary: "",
        language: "en",
        tags: ["community", "ai"],
        entities: ["OpenAI"],
        importanceScore: 92,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "test fixture",
        actionLabels: ["打开原文"]
      },
      "digest-hn-2"
    );

    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ authorization: "Bearer test-key" });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "## 今日重点\n- [1] OpenAI coding agent 更新值得关注。" } }] }),
        { status: 200 }
      );
    });

    const result = await generateTechDigestForDatabase(database, {
      fetcher,
      refresh: false
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.digestOutput).toContain("OpenAI coding agent");
  });
});
```

- [ ] **Step 2: Run the failing action test**

Run:

```powershell
pnpm test tests/digest-action.test.ts
```

Expected result: fail because `generateTechDigestForDatabase` does not exist.

- [ ] **Step 3: Add digest action state type**

Modify `lib/domain.ts`:

```ts
export interface DigestActionState {
  digestOutput?: string;
  insertedCount?: number;
  ok: boolean;
  refreshedCount?: number;
  message: string;
}
```

- [ ] **Step 4: Add repository helpers for digest items and persisted digest task**

Modify `lib/db/repositories.ts` by adding this exported function near `listItems`:

```ts
export async function listDigestItems(
  database = getDatabase(),
  options: { limit?: number; search?: string } = {}
): Promise<Item[]> {
  const rows = await database.db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.publishedAt))
    .limit(options.limit ?? 120);

  let items = rows.map(itemFromRow).filter((item) => !item.hidden);

  if (options.search) {
    const query = options.search.toLowerCase();
    items = items.filter((item) => searchableText(item).includes(query));
  }

  return items;
}
```

Then add this exported function near `runAgentTask`:

```ts
export async function createDigestTask(
  database: NarroDatabase,
  input: {
    error?: string;
    lensId: string;
    output: string;
    status: AgentTaskStatus;
  }
): Promise<AgentTask> {
  const now = new Date().toISOString();
  const id = `digest-${now.replace(/[^0-9]/g, "")}`;

  await database.db.insert(agentTasksTable).values({
    id,
    type: "daily_brief",
    lensId: input.lensId,
    itemId: null,
    status: input.status,
    input: "今日科技简报",
    output: input.output,
    error: input.error ?? "",
    createdAt: now,
    updatedAt: now
  });

  const [row] = await database.db.select().from(agentTasksTable).where(eq(agentTasksTable.id, id)).limit(1);
  return agentTaskFromRow(row);
}
```

- [ ] **Step 5: Improve LLM daily brief prompt to accept full digest prompt**

Modify the daily brief branch in `lib/agent/llm.ts`:

```ts
  return input.taskInput.includes("中文科技简报")
    ? input.taskInput
    : `请为当前 Lens 生成今日简报。要求：3-5 条要点，每条说明为什么重要，并尽量合并重复事件。\n任务输入: ${input.taskInput}\n\n${itemLines}`;
```

- [ ] **Step 6: Add digest generation helper and server action**

Modify `app/actions.ts` imports:

```ts
import type { DigestActionState, RefreshActionState, SourceType } from "@/lib/domain";
import { generateDigestFromItems } from "@/lib/digest/generator";
import { selectDigestEntries } from "@/lib/digest/source-pack";
```

Also import repository helpers:

```ts
  createDigestTask,
  listDigestItems,
```

Add this exported helper and action:

```ts
export async function generateTechDigestForDatabase(
  database = getDatabase(),
  options: {
    fetcher?: typeof fetch;
    refresh?: boolean;
  } = {}
): Promise<DigestActionState> {
  await prepareDatabase(database);

  let refreshedCount = 0;
  let insertedCount = 0;

  if (options.refresh !== false) {
    const results = await Promise.all(
      techDigestSourceIds.map((sourceId) =>
        refreshSource(database, sourceId, {
          fetcher: options.fetcher,
          limit: 8,
          timeoutMs: 10000
        })
      )
    );
    refreshedCount = results.length;
    insertedCount = results.reduce((total, result) => total + result.insertedCount, 0);
  }

  const items = await listDigestItems(database, { limit: 120 });
  const sources = await listRealSources(database);
  const settings = await listSettings(database);
  const entries = selectDigestEntries({ items, sources });

  const result = await generateDigestFromItems({
    entries,
    settings: {
      provider: settings["llm.provider"],
      baseUrl: settings["llm.baseUrl"],
      model: settings["llm.model"],
      apiKey: settings["llm.apiKey"] || process.env.NARRO_LLM_API_KEY
    },
    llmOptions: {
      fetcher: options.fetcher
    }
  });

  await createDigestTask(database, {
    lensId: "ai-coding",
    output: result.output,
    status: result.status,
    error: result.error
  });

  return {
    digestOutput: result.output,
    insertedCount,
    ok: true,
    refreshedCount,
    message: result.usedFallback
      ? `已生成本地简报，引用 ${entries.length} 条信息`
      : `已生成 AI 简报，引用 ${entries.length} 条信息`
  };
}

export async function generateTechDigestAction(): Promise<DigestActionState> {
  const database = getDatabase();
  const state = await generateTechDigestForDatabase(database);
  revalidatePath("/");
  return state;
}
```

For `useActionState` compatibility, if TypeScript requires an action signature with previous state, use:

```ts
export async function generateTechDigestAction(_previousState?: DigestActionState): Promise<DigestActionState> {
  const database = getDatabase();
  const state = await generateTechDigestForDatabase(database);
  revalidatePath("/");
  return state;
}
```

- [ ] **Step 7: Save API key from model settings form**

Modify `saveLlmSettingsAction` in `app/actions.ts`:

```ts
  const apiKey = String(formData.get("apiKey") || "").trim();
  if (apiKey) {
    await saveSetting(database, "llm.apiKey", apiKey);
  }
```

Do not erase an existing API key when the submitted field is blank.

- [ ] **Step 8: Run action tests**

Run:

```powershell
pnpm test tests/digest-action.test.ts
```

Expected result: pass.

---

## Task 4: Simplified Digest UI Components

**Files:**
- Create: `components/digest/digest-action-panel.tsx`
- Create: `components/digest/digest-card.tsx`
- Create: `components/digest/model-settings-form.tsx`
- Create: `components/digest/article-list.tsx`
- Create: `components/digest/digest-workspace.tsx`
- Modify: `components/app-shell/narro-workspace.tsx`
- Modify: `components/app-shell/top-bar.tsx`
- Test: `tests/digest-workspace.test.tsx`

- [ ] **Step 1: Write failing UI test**

Create `tests/digest-workspace.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { NarroWorkspace } from "@/components/app-shell/narro-workspace";
import type { AgentTask, Item, Lens, Source, WorkspaceSummary } from "@/lib/domain";

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
  summary: "Developers discuss a fast local AI coding workspace.",
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

const digestTask: AgentTask = {
  id: "digest-1",
  type: "daily_brief",
  title: "生成今日简报",
  description: "基于当前 Lens 生成可回链的本地简报。",
  lensId: "ai-coding",
  status: "completed",
  input: "今日科技简报",
  output: "## 今日重点\n- [1] AI coding workspace 正在升温。",
  createdAt: "2026-05-28T02:00:00.000Z",
  updatedAt: "2026-05-28T02:00:00.000Z",
  primary: true
};

const lens: Lens = {
  id: "ai-coding",
  name: "AI 编程工具",
  description: "关注 AI 编程工具。",
  sourceGroupFilters: [],
  keywordFilters: [],
  entityFilters: [],
  tagFilters: [],
  rankingMode: "event_first",
  active: true,
  unreadCount: 1
};

const summary: WorkspaceSummary = {
  activeLensId: "ai-coding",
  updatedSourceCount: 1,
  totalUnreadCount: 1,
  digestTitle: "AI 编程工具 实时摘要",
  digestBody: "当前 Lens 命中 1 条真实入库信息。"
};

describe("simplified digest workspace", () => {
  test("renders the digest path and removes secondary controls", () => {
    render(
      <NarroWorkspace
        activeLensId="ai-coding"
        agentTasks={[digestTask]}
        dataSources={[]}
        eventGroups={[]}
        items={[item]}
        lenses={[lens]}
        refreshLogs={[]}
        settings={{ "llm.provider": "openai-compatible", "llm.baseUrl": "https://api.example.com/v1", "llm.model": "test-model" }}
        sources={[source]}
        summary={summary}
      />
    );

    expect(screen.getByRole("main", { name: "今日科技简报" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
    expect(screen.getByText("## 今日重点")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Show HN: Fast AI coding workspace/ })).toHaveAttribute("href", item.url);

    expect(screen.queryByRole("navigation", { name: "信息源和视角" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Agent 任务" })).not.toBeInTheDocument();
    expect(screen.queryByText("高级筛选")).not.toBeInTheDocument();
    expect(screen.queryByText("事件组与趋势")).not.toBeInTheDocument();
    expect(screen.queryByText("M1 先接这些")).not.toBeInTheDocument();

    const banner = screen.getByRole("banner");
    expect(within(banner).getByPlaceholderText("搜索已抓取的文章")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing UI test**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result: fail because digest components do not exist and old UI still renders.

- [ ] **Step 3: Create digest action panel**

Create `components/digest/digest-action-panel.tsx`:

```tsx
"use client";

import { NewspaperClipping } from "@phosphor-icons/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateTechDigestAction } from "@/app/actions";
import type { DigestActionState } from "@/lib/domain";

const initialState: DigestActionState = {
  ok: true,
  message: ""
};

export function DigestActionPanel() {
  const [state, formAction] = useActionState(generateTechDigestAction, initialState);

  return (
    <form action={formAction} className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">生成今日科技简报</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">抓取默认科技源，合并要点，并生成一篇中文摘要。</p>
        </div>
        <GenerateButton />
      </div>
      {state.message ? (
        <p className={["mt-3 text-xs leading-5", state.ok ? "text-teal-700" : "text-amber-700"].join(" ")}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function GenerateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="生成今日科技简报"
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition active:translate-y-px disabled:cursor-wait disabled:opacity-80"
      disabled={pending}
      type="submit"
    >
      <NewspaperClipping size={16} aria-hidden="true" />
      {pending ? "生成中" : "生成今日科技简报"}
    </button>
  );
}
```

If `useActionState` reports an overload error, update `generateTechDigestAction` as shown in Task 3 Step 6 so it accepts `_previousState`.

- [ ] **Step 4: Create digest card**

Create `components/digest/digest-card.tsx`:

```tsx
import type { AgentTask } from "@/lib/domain";

interface DigestCardProps {
  latestDigest?: AgentTask;
}

export function DigestCard({ latestDigest }: DigestCardProps) {
  const output = latestDigest?.output?.trim();

  return (
    <section aria-labelledby="digest-heading" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Digest</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950" id="digest-heading">
            今日科技简报
          </h2>
        </div>
        {latestDigest ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
            {formatTime(latestDigest.updatedAt)}
          </span>
        ) : null}
      </div>
      {output ? (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{output}</pre>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-900">还没有生成简报。</p>
          <p className="mt-1">配置模型后点击生成；没有模型时也会先生成本地可读摘要。</p>
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
```

- [ ] **Step 5: Create model settings form**

Create `components/digest/model-settings-form.tsx`:

```tsx
import { saveLlmSettingsAction } from "@/app/actions";

interface ModelSettingsFormProps {
  settings: Record<string, string>;
}

export function ModelSettingsForm({ settings }: ModelSettingsFormProps) {
  return (
    <section aria-labelledby="model-settings-heading" className="rounded-md border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-950" id="model-settings-heading">
        模型设置
      </h2>
      <form action={saveLlmSettingsAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1.5fr_1fr_1fr_auto] md:items-end">
        <Field defaultValue={settings["llm.provider"] ?? "openai-compatible"} label="Provider" name="provider" />
        <Field defaultValue={settings["llm.baseUrl"] ?? ""} label="Base URL" name="baseUrl" placeholder="https://api.openai.com/v1" />
        <Field defaultValue={settings["llm.model"] ?? ""} label="Model" name="model" placeholder="gpt-5-mini" />
        <Field label="API Key" name="apiKey" placeholder={settings["llm.apiKey"] ? "已保存，留空不修改" : "sk-..."} type="password" />
        <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700" type="submit">
          保存
        </button>
      </form>
    </section>
  );
}

interface FieldProps {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}

function Field({ defaultValue, label, name, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
```

- [ ] **Step 6: Create article list**

Create `components/digest/article-list.tsx`:

```tsx
import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import type { Item, Source } from "@/lib/domain";

interface ArticleListProps {
  items: Item[];
  sources: Source[];
}

export function ArticleList({ items, sources }: ArticleListProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <section aria-labelledby="article-list-heading" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950" id="article-list-heading">
          引用文章
        </h2>
        <span className="font-mono text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length > 0 ? (
          items.slice(0, 24).map((item, index) => (
            <a
              className="flex gap-3 py-3 text-sm transition hover:bg-slate-50"
              href={item.url}
              key={item.id}
              rel="noreferrer"
              target="_blank"
            >
              <span className="mt-0.5 font-mono text-xs text-slate-400">[{index + 1}]</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-5 text-slate-950">{item.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                  {sourceById.get(item.sourceId)?.name ?? item.sourceId} · {item.summary}
                </span>
              </span>
              <ArrowSquareOut className="mt-1 shrink-0 text-slate-400" size={15} aria-hidden="true" />
            </a>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-600">还没有可引用文章。点击生成简报会先刷新默认科技源。</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Create digest workspace**

Create `components/digest/digest-workspace.tsx`:

```tsx
import type { AgentTask, Item, Source } from "@/lib/domain";
import { ArticleList } from "./article-list";
import { DigestActionPanel } from "./digest-action-panel";
import { DigestCard } from "./digest-card";
import { ModelSettingsForm } from "./model-settings-form";

interface DigestWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function DigestWorkspace({ agentTasks, items, settings, sources }: DigestWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);

  return (
    <main aria-label="今日科技简报" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <DigestActionPanel />
      <ModelSettingsForm settings={settings} />
      <DigestCard latestDigest={latestDigest} />
      <ArticleList items={items} sources={sources} />
    </main>
  );
}
```

- [ ] **Step 8: Replace workspace shell**

Modify `components/app-shell/narro-workspace.tsx` imports:

```ts
import { DigestWorkspace } from "@/components/digest/digest-workspace";
import { TopBar } from "./top-bar";
```

Replace the component body with:

```tsx
export function NarroWorkspace({
  activeLensId,
  activeSourceId,
  agentTasks,
  items,
  lenses,
  searchQuery,
  settings,
  sources,
  summary
}: NarroWorkspaceProps) {
  const activeLens = lenses.find((lens) => lens.id === summary.activeLensId) ?? lenses[0];

  return (
    <div className="min-h-[100dvh] px-3 py-3 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
        <TopBar
          activeLensId={activeLensId}
          activeLensName={activeLens.name}
          activeSourceId={activeSourceId}
          searchQuery={searchQuery}
          summary={summary}
        />
        <div className="overflow-hidden rounded-md border border-slate-300/80 bg-slate-300/80">
          <DigestWorkspace agentTasks={agentTasks} items={items} settings={settings} sources={sources} />
        </div>
      </div>
    </div>
  );
}
```

Remove unused props from destructuring after TypeScript reports them.

- [ ] **Step 9: Simplify top bar copy**

Modify the search placeholder in `components/app-shell/top-bar.tsx`:

```tsx
placeholder="搜索已抓取的文章"
```

Remove the `Bell` unread link from the rendered header. Keep only the compact source count if it still fits cleanly.

- [ ] **Step 10: Run UI test**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result: pass.

---

## Task 5: Page Data And Old Test Cleanup

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/home-workspace.test.tsx`
- Modify: `tests/runtime-polish.test.ts`

- [ ] **Step 1: Simplify page query parsing**

Modify `app/page.tsx` so it only reads:

```ts
const lensId = "ai-coding";
const searchQuery = firstParam(params?.q);
```

Load workspace data with existing `getWorkspaceData`, then override the displayed items with unfiltered digest items:

```ts
const workspace = await getWorkspaceData(getDatabase(), {
  lensId,
  search: searchQuery
});
const digestItems = await listDigestItems(getDatabase(), {
  limit: 120,
  search: searchQuery
});
```

Pass `digestItems` to `NarroWorkspace`:

```tsx
<NarroWorkspace
  activeLensId={lensId}
  agentTasks={workspace.agentTasks}
  dataSources={dataSourceCandidates}
  eventGroups={[]}
  items={digestItems}
  lenses={workspace.lenses}
  refreshLogs={[]}
  searchQuery={searchQuery}
  settings={workspace.settings}
  sources={workspace.sources}
  summary={workspace.summary}
/>
```

Keep `firstParam`; delete unused `parseView` and `parseNumber`.

- [ ] **Step 2: Replace old homepage test expectations**

In `tests/home-workspace.test.tsx`, remove assertions for:

- Navigation sidebar.
- Agent sidebar.
- Advanced filters.
- Event details.
- OPML.
- Source management buttons.
- Lens settings.
- Feed view links.

Add assertions for:

```tsx
expect(screen.getByRole("main", { name: "今日科技简报" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
expect(screen.getByText("模型设置")).toBeInTheDocument();
expect(screen.getByText("引用文章")).toBeInTheDocument();
expect(screen.queryByText("高级筛选")).not.toBeInTheDocument();
expect(screen.queryByText("Agent 任务")).not.toBeInTheDocument();
```

- [ ] **Step 3: Remove roadmap assertion**

In `tests/runtime-polish.test.ts`, remove the test that asserts `dataSourceCandidates` appear in the UI. Keep runtime config tests.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
pnpm test tests/home-workspace.test.tsx tests/runtime-polish.test.ts tests/digest-workspace.test.tsx
```

Expected result: pass.

---

## Task 6: Remove Dead Main-Page Imports

**Files:**
- Modify or delete after import scan:
  - `components/navigation/source-lens-sidebar.tsx`
  - `components/agent-tasks/agent-sidebar.tsx`
  - `components/feed/feed-workspace.tsx`
  - `components/feed/feed-card.tsx`

- [ ] **Step 1: Search for remaining imports**

Run:

```powershell
rg -n "SourceLensSidebar|AgentSidebar|FeedWorkspace|FeedCard" app components tests
```

Expected result: either no production imports, or only tests that still need cleanup.

- [ ] **Step 2: Delete unreferenced UI files if no imports remain**

If Step 1 returns no imports, delete:

```powershell
Remove-Item components\navigation\source-lens-sidebar.tsx
Remove-Item components\agent-tasks\agent-sidebar.tsx
Remove-Item components\feed\feed-workspace.tsx
Remove-Item components\feed\feed-card.tsx
```

Do not delete backend actions or repositories in this task.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
pnpm typecheck
```

Expected result: pass. If TypeScript reports an import from a deleted file, restore the file or remove the import in the same task.

---

## Task 7: End-To-End Manual Verification

**Files:**
- No new files.

- [ ] **Step 1: Reset local generated data**

Run:

```powershell
pnpm db:reset
```

Expected result: no error if `data/narro.db` exists or not.

- [ ] **Step 2: Start dev server**

Run:

```powershell
pnpm dev --port 3001
```

Expected result: Next.js starts at `http://127.0.0.1:3001`.

- [ ] **Step 3: Verify empty page**

Open:

```text
http://127.0.0.1:3001
```

Expected result:

- Page title area says Narro.
- Main region says "今日科技简报".
- No left sidebar.
- No right Agent sidebar.
- No "高级筛选".
- No "事件组与趋势".
- There is one primary "生成今日科技简报" button.

- [ ] **Step 4: Generate digest without model settings**

Click:

```text
生成今日科技简报
```

Expected result:

- Button enters "生成中".
- Page returns with a fallback local digest.
- Referenced articles appear below.
- Original article links open in new tabs.

- [ ] **Step 5: Generate digest with model settings**

Fill model settings:

```text
Provider: openai-compatible
Base URL: https://api.openai.com/v1
Model: gpt-5-mini
API Key: <valid key>
```

Click save, then click "生成今日科技简报".

Expected result:

- Digest output is no longer just title-list fallback.
- Digest has sections and reference numbers.
- Article list still contains the source items.

- [ ] **Step 6: Run full validation**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected result: all pass.

---

## Acceptance Criteria

The work is complete only when all of these are true:

- Homepage has one obvious primary path: generate and read a tech digest.
- No source/lens/agent/OPML/advanced-filter controls are visible on the main page.
- The search box no longer claims the user can ask questions.
- A user can enter model settings, including API key, from the page.
- Clicking "生成今日科技简报" refreshes a small stable source pack and creates a digest.
- If no model is configured, the product still produces a local fallback digest.
- Digest output is displayed in the main page, not hidden in a right sidebar task card.
- Referenced articles are visible below the digest and link to originals.
- Existing backend ingestion remains available.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass.

## Scope Guard

Do not implement these in this phase:

- Deployment changes.
- Database migration tooling.
- Multi-user auth.
- Scheduled worker.
- Source directory UI.
- OPML UI.
- Lens editor.
- Event grouping UI.
- Semantic search.
- Chat or Q&A.
- Notifications.
- Docker.

These may be useful later, but they are not part of making the basic product usable.

## Self-Review

- The plan focuses on the primary product loop and removes secondary UI from the homepage.
- The plan keeps existing ingestion infrastructure instead of rebuilding it.
- The plan adds API-key configuration because digest generation is not usable without it.
- The plan provides a no-LLM fallback so the page still works in a fresh local environment.
- The plan includes tests before implementation for generator logic, server action behavior, and simplified UI.
- The plan avoids deployment, migration, and long-term maintenance topics by design.
