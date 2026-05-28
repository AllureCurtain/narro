# Narro Core Product Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Narro from a usable one-shot tech digest MVP to a reliable daily-reading product by improving refresh feedback, digest quality, article actions, first-use states, and project documentation.

**Architecture:** Keep the current simplified homepage and fixed tech digest loop. Add focused helpers around the existing `generateTechDigestForDatabase`, `DigestActionStatus`, `DigestCard`, and `ArticleList` components. Do not reintroduce the old source sidebar, Lens editor, Agent sidebar, event panels, OPML UI, deployment work, or database migration work.

**Tech Stack:** Next.js 16 App Router, React 19, Server Actions, TypeScript 6, Tailwind CSS 4, Vitest, Testing Library, existing libSQL/Drizzle repository layer, existing OpenAI-compatible LLM adapter.

---

## Current Product Problems

### Problem 1: Refresh Failures Are Too Opaque

Current behavior:

- The generate action returns `refreshedCount`, `insertedCount`, and `failedCount`.
- The UI can show "失败 8 个", but it does not tell the user which source failed or why.
- A successful source with `0` new items is indistinguishable from a broken source unless the user reads logs outside the main page.

Why this blocks the main product:

- The primary action is "生成今日科技简报".
- If it fails or produces no useful content, the user needs immediate source-level feedback in the same digest path.
- This is not an ops feature; it is basic product usability for the only main action.

### Problem 2: Digest Quality Is Still Too Shallow

Current behavior:

- The LLM prompt asks for sections and citations, but the source material is a flat list.
- The fallback digest is mostly a title list.
- Similar stories can appear as separate bullets.
- The output does not strongly enforce "why this matters".

Why this blocks the main product:

- A daily digest product is judged by summary quality.
- If the no-model fallback is too thin, a fresh local install feels unfinished.
- If the LLM gets a flat pile of articles, it has to infer grouping without enough structure.

### Problem 3: Referenced Articles Have Too Few Actions

Current behavior:

- The article list links to originals.
- The user cannot copy the digest.
- The user cannot mark referenced articles as read.
- The user cannot hide an irrelevant referenced article from future digest selection.
- The article row lacks a clear published time.

Why this blocks the main product:

- After reading a digest, the natural next actions are copy/share, open, mark read, and remove noise.
- These are core reading actions, not a return to the old complex workbench.

### Problem 4: First-Use And Empty States Are Not Explicit Enough

Current behavior:

- Empty digest, no articles, local fallback, AI digest, refresh failures, and no configured model are only partially distinguished.
- The user sees usable UI, but not enough guidance about what happened.

Why this blocks the main product:

- The first session usually starts with no model settings and no local data.
- The app should explain whether it created a local fallback, generated through AI, failed to fetch sources, or simply has no articles yet.

### Problem 5: README Still Describes The Old Product Shape

Current behavior:

- `README.md` still says the homepage is a real-time information flow with Lens, source/sidebar controls, and Agent task sidebar.
- The implemented homepage is now the simplified "今日科技简报" path.

Why this blocks development:

- Future goal-mode sessions will read the README and may optimize the wrong product.
- The docs should reflect the current product boundary: finish the digest product before reintroducing advanced workbench features.

---

## Scope Guard

Implement only the core product improvements in this plan.

Do not implement:

- Deployment changes.
- Database migration tooling.
- Multi-user accounts.
- Auth.
- Scheduled workers.
- Source directory UI.
- OPML UI.
- Lens editor UI.
- Event grouping UI.
- Chat or Q&A.
- Semantic search.
- Notifications.
- Docker.

Existing backend code for these older capabilities can remain unless it directly blocks the simplified digest path.

---

## File Structure

### Create

- `lib/digest/topic-groups.ts`
  - Groups selected digest entries into stable digest sections before prompt/fallback generation.

- `components/digest/copy-digest-button.tsx`
  - Client-only copy button for the current digest output.

- `tests/digest-topic-groups.test.ts`
  - Unit coverage for deterministic grouping and section order.

### Modify

- `lib/domain.ts`
  - Extend `DigestActionState` with `mode`, `articleCount`, and per-source refresh details.

- `app/actions.ts`
  - Populate source-level refresh detail in `generateTechDigestForDatabase`.
  - Return explicit digest mode: `ai`, `local`, or `empty`.

- `lib/digest/generator.ts`
  - Use grouped source material in prompts.
  - Improve fallback digest from title list to sectioned explanation with citations.

- `components/digest/digest-action-panel.tsx`
  - Render source-level refresh details and clearer status text.

- `components/digest/digest-card.tsx`
  - Show digest mode badge.
  - Add copy button.
  - Improve empty/local/AI state language.

- `components/digest/article-list.tsx`
  - Add published time.
  - Add compact "已读" and "隐藏" actions using existing `updateItemStateAction`.
  - Keep original-link behavior.

- `components/digest/digest-workspace.tsx`
  - Pass richer state into digest/article components if needed.
  - Keep the page centered on the digest path.

- `README.md`
  - Replace old workbench description with the current digest MVP description and next-step boundary.

- Tests:
  - `tests/digest-action.test.ts`
  - `tests/digest-action-panel.test.tsx`
  - `tests/digest-generator.test.ts`
  - `tests/digest-workspace.test.tsx`
  - `tests/home-workspace.test.tsx`

---

## Task 1: Source-Level Refresh Feedback

**Files:**
- Modify: `lib/domain.ts`
- Modify: `app/actions.ts`
- Modify: `components/digest/digest-action-panel.tsx`
- Test: `tests/digest-action.test.ts`
- Test: `tests/digest-action-panel.test.tsx`

### Implementation Idea

Extend the digest action response so the main page can show a compact refresh detail list:

- Source name.
- Success/failure state.
- Fetched count.
- Inserted count.
- Failure message when present.

This uses the existing `RefreshResult` returned by `refreshSource`. It does not add new persistence.

### Steps

- [ ] **Step 1: Add failing action test for source details**

Add this assertion to `tests/digest-action.test.ts` inside `reports refresh failures when no digest articles are available`:

```ts
expect(result.sourceResults).toHaveLength(8);
expect(result.sourceResults?.[0]).toMatchObject({
  sourceId: "hacker-news-rss",
  ok: false,
  fetchedCount: 0,
  insertedCount: 0
});
expect(result.sourceResults?.[0].sourceName).toBeTruthy();
expect(result.sourceResults?.[0].error).toContain("HTTP 503");
```

Run:

```powershell
pnpm test tests/digest-action.test.ts
```

Expected result: fail because `DigestActionState` has no `sourceResults`.

- [ ] **Step 2: Extend domain types**

Modify `lib/domain.ts`:

```ts
export type DigestMode = "ai" | "empty" | "local";

export interface DigestSourceResult {
  error?: string;
  fetchedCount: number;
  insertedCount: number;
  ok: boolean;
  sourceId: string;
  sourceName: string;
}

export interface DigestActionState {
  articleCount?: number;
  digestOutput?: string;
  failedCount?: number;
  insertedCount?: number;
  mode?: DigestMode;
  ok: boolean;
  refreshedCount?: number;
  sourceResults?: DigestSourceResult[];
  message: string;
}
```

- [ ] **Step 3: Populate source detail in the action**

Modify `generateTechDigestForDatabase` in `app/actions.ts`.

Use a local variable before refresh:

```ts
let sourceResults: DigestActionState["sourceResults"] = [];
```

After refresh finishes and after `const sources = await listRealSources(database);`, map results like this:

```ts
const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
sourceResults = results.map((result) => ({
  error: result.error,
  fetchedCount: result.fetchedCount,
  insertedCount: result.insertedCount,
  ok: result.ok,
  sourceId: result.sourceId,
  sourceName: sourceNameById.get(result.sourceId) ?? result.sourceId
}));
```

If the current code declares `sources` after the refresh block, keep the raw `results` in a `refreshResults` variable and map them after `sources` is available.

Return:

```ts
return {
  articleCount: entries.length,
  digestOutput: result.output,
  failedCount,
  insertedCount,
  mode: entries.length === 0 ? "empty" : result.usedFallback ? "local" : "ai",
  ok,
  refreshedCount,
  sourceResults,
  message: result.usedFallback
    ? `已生成本地简报，引用 ${entries.length} 条信息${failureMessage}`
    : `已生成 AI 简报，引用 ${entries.length} 条信息${failureMessage}`
};
```

- [ ] **Step 4: Add failing UI test for refresh details**

Add to `tests/digest-action-panel.test.tsx`:

```tsx
test("shows source-level refresh details", () => {
  render(
    <DigestActionStatus
      state={{
        articleCount: 1,
        failedCount: 1,
        insertedCount: 2,
        mode: "local",
        ok: true,
        refreshedCount: 2,
        message: "已生成本地简报，引用 1 条信息；1 个源刷新失败",
        sourceResults: [
          {
            sourceId: "hacker-news-rss",
            sourceName: "Hacker News RSS",
            ok: true,
            fetchedCount: 8,
            insertedCount: 2
          },
          {
            sourceId: "lobsters-rss",
            sourceName: "Lobsters RSS",
            ok: false,
            fetchedCount: 0,
            insertedCount: 0,
            error: "HTTP 503"
          }
        ]
      }}
    />
  );

  expect(screen.getByText("Hacker News RSS")).toBeInTheDocument();
  expect(screen.getByText("8 抓取 / 2 新增")).toBeInTheDocument();
  expect(screen.getByText("Lobsters RSS")).toBeInTheDocument();
  expect(screen.getByText("HTTP 503")).toBeInTheDocument();
});
```

Run:

```powershell
pnpm test tests/digest-action-panel.test.tsx
```

Expected result: fail because the UI does not render `sourceResults`.

- [ ] **Step 5: Render source details**

Modify `DigestActionStatus` in `components/digest/digest-action-panel.tsx`.

After the message paragraph, render:

```tsx
{state.sourceResults && state.sourceResults.length > 0 ? (
  <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
    <summary className="cursor-pointer font-medium text-slate-700">刷新明细</summary>
    <div className="mt-2 divide-y divide-slate-200">
      {state.sourceResults.map((result) => (
        <div className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto]" key={result.sourceId}>
          <span className="font-medium text-slate-700">{result.sourceName}</span>
          <span className={result.ok ? "text-slate-500" : "text-amber-700"}>
            {result.ok
              ? `${result.fetchedCount} 抓取 / ${result.insertedCount} 新增`
              : result.error ?? "刷新失败"}
          </span>
        </div>
      ))}
    </div>
  </details>
) : null}
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm test tests/digest-action.test.ts tests/digest-action-panel.test.tsx
pnpm typecheck
```

Expected result: both commands pass.

Commit:

```powershell
git add lib/domain.ts app/actions.ts components/digest/digest-action-panel.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx
git commit -m "feat: show digest refresh details"
```

### Acceptance Criteria

- Generate action response includes per-source refresh results.
- Status panel shows source names and errors.
- Successful sources show fetched and inserted counts.
- Failed sources show a concise error.
- No old source/sidebar UI returns to the homepage.

---

## Task 2: Improve Digest Quality And Fallback Grouping

**Files:**
- Create: `lib/digest/topic-groups.ts`
- Modify: `lib/digest/generator.ts`
- Test: `tests/digest-topic-groups.test.ts`
- Test: `tests/digest-generator.test.ts`

### Implementation Idea

Add a deterministic grouping layer before prompt/fallback generation. The LLM should receive grouped sections, and the fallback should use the same groups so a no-model install still produces a readable digest.

Initial groups:

- `今日重点`
- `AI 与开发工具`
- `平台与产品变化`
- `工程与开源生态`
- `值得继续跟踪`

Use lightweight keyword/entity heuristics. This is enough for MVP and avoids adding embeddings or semantic search.

### Steps

- [ ] **Step 1: Write failing grouping tests**

Create `tests/digest-topic-groups.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import type { Item, Source } from "@/lib/domain";
import { groupDigestEntries } from "@/lib/digest/topic-groups";

const source: Source = {
  id: "hacker-news-rss",
  name: "Hacker News RSS",
  type: "rss",
  url: "https://news.ycombinator.com/rss",
  group: "社区讨论",
  enabled: true,
  refreshIntervalMinutes: 30,
  lastFetchedAt: "",
  failureCount: 0,
  healthStatus: "healthy",
  itemCount: 2,
  averageLatencyMs: 0,
  lastError: "",
  nextRefreshAt: "",
  unreadCount: 2
};

const baseItem: Item = {
  id: "item-1",
  sourceId: "hacker-news-rss",
  title: "OpenAI ships a coding agent update",
  url: "https://example.com/agent",
  author: "Hacker News",
  publishedAt: "2026-05-28T01:00:00.000Z",
  fetchedAt: "2026-05-28T02:00:00.000Z",
  summary: "A coding agent update for developer workflows.",
  aiSummary: "",
  language: "en",
  tags: ["ai", "developer"],
  entities: ["OpenAI"],
  importanceScore: 92,
  readStatus: "unread",
  saved: false,
  hidden: false,
  reason: "test",
  actionLabels: ["打开原文"]
};

describe("digest topic groups", () => {
  test("groups AI developer stories before general platform updates", () => {
    const groups = groupDigestEntries([
      { item: baseItem, source },
      {
        item: {
          ...baseItem,
          id: "item-2",
          title: "AWS updates its platform release notes",
          summary: "AWS describes a cloud platform update.",
          entities: ["AWS"],
          tags: ["platform"]
        },
        source
      }
    ]);

    expect(groups.map((group) => group.title)).toEqual(["AI 与开发工具", "平台与产品变化"]);
    expect(groups[0].entries[0].item.id).toBe("item-1");
  });
});
```

Run:

```powershell
pnpm test tests/digest-topic-groups.test.ts
```

Expected result: fail because `topic-groups.ts` does not exist.

- [ ] **Step 2: Implement grouping helper**

Create `lib/digest/topic-groups.ts`:

```ts
import type { DigestEntry } from "./types";

export interface DigestTopicGroup {
  entries: DigestEntry[];
  id: "ai-tools" | "follow-up" | "open-source" | "platform" | "top";
  title: string;
}

const groupDefinitions: Array<Omit<DigestTopicGroup, "entries"> & { keywords: string[] }> = [
  {
    id: "top",
    title: "今日重点",
    keywords: ["breaking", "launch", "ships", "release", "重大", "发布"]
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

function classifyDigestEntry(entry: DigestEntry) {
  const text = [
    entry.item.title,
    entry.item.summary,
    entry.item.tags.join(" "),
    entry.item.entities.join(" "),
    entry.source.name
  ]
    .join(" ")
    .toLowerCase();

  return groupDefinitions.find((group) => group.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    ?? groupDefinitions[groupDefinitions.length - 1];
}
```

- [ ] **Step 3: Verify grouping test passes**

Run:

```powershell
pnpm test tests/digest-topic-groups.test.ts
```

Expected result: pass.

- [ ] **Step 4: Add failing generator tests for grouped prompt and fallback**

Add to `tests/digest-generator.test.ts`:

```ts
test("builds prompt with grouped digest sections", () => {
  const prompt = buildDigestPrompt([
    { item, source },
    {
      item: {
        ...item,
        id: "hn-2",
        title: "AWS platform update for model hosting",
        summary: "AWS updates model hosting APIs.",
        entities: ["AWS"],
        tags: ["platform"]
      },
      source
    }
  ]);

  expect(prompt).toContain("按以下分组组织简报");
  expect(prompt).toContain("AI 与开发工具");
  expect(prompt).toContain("平台与产品变化");
});

test("fallback digest explains why items matter", async () => {
  const result = await generateDigestFromItems({
    entries: [{ item, source }],
    settings: {},
    llmOptions: {}
  });

  expect(result.output).toContain("## AI 与开发工具");
  expect(result.output).toContain("值得关注");
});
```

Run:

```powershell
pnpm test tests/digest-generator.test.ts
```

Expected result: fail because the prompt/fallback are not grouped yet.

- [ ] **Step 5: Update prompt and fallback**

Modify `lib/digest/generator.ts`:

```ts
import { groupDigestEntries } from "./topic-groups";
```

In `buildDigestPrompt`, build grouped blocks:

```ts
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
```

Update the prompt requirements:

```ts
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
```

Replace `buildFallbackDigest` with a grouped version:

```ts
function buildFallbackDigest(entries: DigestEntry[]): string {
  const groups = groupDigestEntries(entries.slice(0, 10));

  return groups
    .flatMap((group) => [
      `## ${group.title}`,
      ...group.entries.map(({ item, source }) => {
        const reference = entries.findIndex((entry) => entry.item.id === item.id) + 1;
        return `- [${reference}] ${item.title}。来源：${source.name}。值得关注：${fallbackReason(item.title, item.summary)}。`;
      }),
      ""
    ])
    .filter((line) => line.length > 0)
    .join("\n");
}

function fallbackReason(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes("agent") || text.includes("coding") || text.includes("ai")) {
    return "它可能影响开发者工具链和 AI 工作流";
  }
  if (text.includes("api") || text.includes("platform") || text.includes("cloud")) {
    return "它可能改变平台能力、接口或成本结构";
  }
  if (text.includes("release") || text.includes("github") || text.includes("open source")) {
    return "它可能带来工程生态和依赖升级变化";
  }
  return "它在当前科技信息流中具有较高信号";
}
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm test tests/digest-topic-groups.test.ts tests/digest-generator.test.ts tests/digest-markdown.test.ts
pnpm typecheck
```

Expected result: all pass.

Commit:

```powershell
git add lib/digest/topic-groups.ts lib/digest/generator.ts tests/digest-topic-groups.test.ts tests/digest-generator.test.ts
git commit -m "feat: improve digest grouping and fallback"
```

### Acceptance Criteria

- Prompt includes grouped source material.
- Fallback digest uses real sections, not just one title list.
- Fallback bullets include a short reason.
- Existing citation indexes still match article references.
- No embedding, semantic search, or new external service is introduced.

---

## Task 3: Add Core Reading Actions

**Files:**
- Create: `components/digest/copy-digest-button.tsx`
- Modify: `components/digest/digest-card.tsx`
- Modify: `components/digest/article-list.tsx`
- Test: `tests/digest-workspace.test.tsx`

### Implementation Idea

Keep article actions compact and directly tied to digest reading:

- Copy digest.
- Open original.
- Mark referenced article as read.
- Hide noisy article from future digest selection.
- Show source and published time.

Use existing `updateItemStateAction` instead of creating new server actions.

### Steps

- [ ] **Step 1: Add failing UI test for copy and article actions**

In `tests/digest-workspace.test.tsx`, add assertions inside `renders the digest path and removes secondary controls`:

```tsx
expect(screen.getByRole("button", { name: "复制简报" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "标记 Show HN: Fast AI coding workspace 为已读" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "隐藏 Show HN: Fast AI coding workspace" })).toBeInTheDocument();
expect(screen.getByText(/2026/)).toBeInTheDocument();
```

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result: fail because these controls do not exist.

- [ ] **Step 2: Create copy button client component**

Create `components/digest/copy-digest-button.tsx`:

```tsx
"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useState } from "react";

interface CopyDigestButtonProps {
  output: string;
}

export function CopyDigestButton({ output }: CopyDigestButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyDigest() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      aria-label="复制简报"
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition active:translate-y-px"
      onClick={copyDigest}
      type="button"
    >
      <ClipboardText size={14} aria-hidden="true" />
      {copied ? "已复制" : "复制"}
    </button>
  );
}
```

- [ ] **Step 3: Add copy button and mode badge to digest card**

Modify `components/digest/digest-card.tsx`.

Import:

```ts
import { CopyDigestButton } from "./copy-digest-button";
```

Inside the header area, when `output` exists, render:

```tsx
{output ? <CopyDigestButton output={output} /> : null}
```

Keep the timestamp visible. If layout gets tight, use:

```tsx
<div className="flex flex-wrap items-center justify-end gap-2">
  {output ? <CopyDigestButton output={output} /> : null}
  {latestDigest ? (
    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
      {formatTime(latestDigest.updatedAt)}
    </span>
  ) : null}
</div>
```

- [ ] **Step 4: Add article actions**

Modify `components/digest/article-list.tsx`.

Import:

```ts
import { updateItemStateAction } from "@/app/actions";
```

Replace the anchor-only row with a row container:

```tsx
<article
  className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
  data-testid={`article-ref-${index + 1}`}
  id={`article-ref-${index + 1}`}
  key={item.id}
>
  <a className="flex min-w-0 gap-3 transition hover:bg-slate-50" href={item.url} rel="noreferrer" target="_blank">
    <span className="mt-0.5 font-mono text-xs text-slate-400">[{index + 1}]</span>
    <span className="min-w-0 flex-1">
      <span className="block font-medium leading-5 text-slate-950">{item.title}</span>
      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
        {sourceById.get(item.sourceId)?.name ?? item.sourceId} · {formatDate(item.publishedAt)} · {item.summary}
      </span>
    </span>
    <ArrowSquareOut className="mt-1 shrink-0 text-slate-400" size={15} aria-hidden="true" />
  </a>
  <div className="flex items-center gap-2 sm:justify-end">
    <form action={updateItemStateAction}>
      <input name="itemId" type="hidden" value={item.id} />
      <input name="readStatus" type="hidden" value="read" />
      <button
        aria-label={`标记 ${item.title} 为已读`}
        className="min-h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
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
        className="min-h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
        type="submit"
      >
        隐藏
      </button>
    </form>
  </div>
</article>
```

Add helper:

```ts
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

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
pnpm typecheck
```

Expected result: all pass.

Commit:

```powershell
git add components/digest/copy-digest-button.tsx components/digest/digest-card.tsx components/digest/article-list.tsx tests/digest-workspace.test.tsx
git commit -m "feat: add digest reading actions"
```

### Acceptance Criteria

- Digest card has a copy button when a digest exists.
- Referenced articles still link to original URLs.
- Each referenced article shows source and published date.
- Each referenced article has compact "已读" and "隐藏" actions.
- Article actions use existing server actions.
- No old feed-card toolbar or advanced article panel returns.

---

## Task 4: Clarify First-Use, Empty, Local, And AI States

**Files:**
- Modify: `lib/domain.ts`
- Modify: `app/actions.ts`
- Modify: `lib/digest/task-input.ts`
- Modify: `lib/db/repositories.ts`
- Modify: `components/digest/digest-card.tsx`
- Modify: `components/digest/digest-action-panel.tsx`
- Modify: `components/digest/digest-workspace.tsx`
- Test: `tests/digest-action.test.ts`
- Test: `tests/digest-action-panel.test.tsx`
- Test: `tests/digest-workspace.test.tsx`

### Implementation Idea

Use explicit product states:

- `empty`: no digestable articles.
- `local`: generated without LLM or after LLM failure.
- `ai`: generated by configured LLM.

The action already knows `result.usedFallback` and `entries.length`; surface that in `DigestActionState` and persist it in the existing digest task input JSON. The UI should read the latest task input so the mode remains correct after a page refresh.

### Steps

- [ ] **Step 1: Add failing action tests for mode**

In `tests/digest-action.test.ts`, add:

```ts
expect(result.articleCount).toBe(1);
expect(result.mode).toBe("local");
```

inside `generates and persists a digest from existing items`.

Inside `uses LLM settings including locally saved API key`, add:

```ts
expect(result.mode).toBe("ai");
expect(result.articleCount).toBe(1);
```

Inside `reports refresh failures when no digest articles are available`, add:

```ts
expect(result.mode).toBe("empty");
expect(result.articleCount).toBe(0);
```

Run:

```powershell
pnpm test tests/digest-action.test.ts
```

Expected result: fail until `mode` and `articleCount` are returned.

- [ ] **Step 2: Return explicit action mode**

If Task 1 has not already added this, modify `generateTechDigestForDatabase` in `app/actions.ts`:

```ts
const mode: DigestActionState["mode"] = entries.length === 0 ? "empty" : result.usedFallback ? "local" : "ai";
```

Return `mode` and `articleCount: entries.length`.

- [ ] **Step 3: Persist mode in digest task input**

Modify `lib/digest/task-input.ts` so the stored payload includes mode.

```ts
import type { DigestMode } from "@/lib/domain";

const digestTaskInputKind = "tech_digest";
const digestTaskInputLabel = "今日科技简报";

interface DigestTaskInputPayload {
  kind: typeof digestTaskInputKind;
  label: typeof digestTaskInputLabel;
  mode?: DigestMode;
  referenceItemIds: string[];
}

export function buildDigestTaskInput(input: { mode?: DigestMode; referenceItemIds: string[] }): string {
  const payload: DigestTaskInputPayload = {
    kind: digestTaskInputKind,
    label: digestTaskInputLabel,
    mode: input.mode,
    referenceItemIds: input.referenceItemIds.filter((itemId) => itemId.trim().length > 0)
  };

  return JSON.stringify(payload);
}

export function parseDigestTaskReferenceIds(input: string): string[] {
  const payload = parseDigestTaskInput(input);
  return payload?.referenceItemIds ?? [];
}

export function parseDigestTaskMode(input: string): DigestMode | undefined {
  return parseDigestTaskInput(input)?.mode;
}

function parseDigestTaskInput(input: string): DigestTaskInputPayload | null {
  try {
    const payload = JSON.parse(input) as Partial<DigestTaskInputPayload>;
    if (payload.kind !== digestTaskInputKind || !Array.isArray(payload.referenceItemIds)) return null;
    const mode = payload.mode === "ai" || payload.mode === "empty" || payload.mode === "local" ? payload.mode : undefined;
    return {
      kind: digestTaskInputKind,
      label: digestTaskInputLabel,
      mode,
      referenceItemIds: payload.referenceItemIds.filter(
        (itemId): itemId is string => typeof itemId === "string" && itemId.trim().length > 0
      )
    };
  } catch {
    return null;
  }
}
```

Modify `createDigestTask` in `lib/db/repositories.ts`:

```ts
mode?: DigestMode;
```

and call:

```ts
input: buildDigestTaskInput({
  mode: input.mode,
  referenceItemIds: input.referenceItemIds ?? []
}),
```

Modify `generateTechDigestForDatabase` in `app/actions.ts` so `createDigestTask` receives the computed mode:

```ts
await createDigestTask(database, {
  lensId: "ai-coding",
  mode,
  output: result.output,
  referenceItemIds: result.references.map((reference) => reference.itemId),
  status: result.status,
  error: result.error
});
```

- [ ] **Step 4: Add failing UI tests for state labels**

In `tests/digest-workspace.test.tsx`, add to an existing digest render test:

```tsx
expect(screen.getByText("本地简报")).toBeInTheDocument();
```

Add a specific persisted AI mode test:

```tsx
test("renders persisted AI digest mode from task input", () => {
  render(
    <NarroWorkspace
      agentTasks={[
        {
          ...digestTask,
          input: JSON.stringify({
            kind: "tech_digest",
            label: "今日科技简报",
            mode: "ai",
            referenceItemIds: ["hn-1"]
          })
        }
      ]}
      items={[item]}
      settings={{}}
      sources={[source]}
      summary={summary}
    />
  );

  expect(screen.getByText("AI 简报")).toBeInTheDocument();
});
```

Add a new test for no digest/no articles:

```tsx
test("explains the first-use empty state", () => {
  render(
    <NarroWorkspace
      agentTasks={[]}
      items={[]}
      settings={{}}
      sources={[source]}
      summary={summary}
    />
  );

  expect(screen.getByText("还没有生成简报。")).toBeInTheDocument();
  expect(screen.getByText("还没有可引用文章。点击生成简报会先刷新默认科技源。")).toBeInTheDocument();
});
```

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result: fail until state labels are rendered.

- [ ] **Step 5: Render mode badge from persisted task input**

Modify `components/digest/digest-workspace.tsx`:

```ts
import { parseDigestTaskMode, parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
```

Then compute:

```ts
const digestMode = latestDigest ? parseDigestTaskMode(latestDigest.input) : undefined;
```

Pass it to `DigestCard`:

```tsx
<DigestCard latestDigest={latestDigest} mode={digestMode} referenceItems={displayedItems} />
```

Modify `DigestCardProps` in `components/digest/digest-card.tsx`:

```ts
import type { AgentTask, DigestMode, Item } from "@/lib/domain";

interface DigestCardProps {
  latestDigest?: AgentTask;
  mode?: DigestMode;
  referenceItems: Item[];
}
```

Use:

```ts
const modeLabel = mode === "ai" ? "AI 简报" : mode === "empty" ? "暂无可用文章" : "本地简报";
```

Render next to the timestamp:

```tsx
{output ? (
  <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700">
    {modeLabel}
  </span>
) : null}
```

- [ ] **Step 6: Improve status messages**

Modify `DigestActionStatus`:

```tsx
{state.mode ? (
  <StatusPill tone={state.mode === "empty" ? "warning" : "neutral"}>
    {state.mode === "ai" ? "AI 简报" : state.mode === "local" ? "本地简报" : "暂无可用文章"}
  </StatusPill>
) : null}
```

Keep the existing counts.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
pnpm test tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/digest-workspace.test.tsx
pnpm typecheck
```

Expected result: all pass.

Commit:

```powershell
git add lib/domain.ts app/actions.ts lib/digest/task-input.ts lib/db/repositories.ts components/digest/digest-card.tsx components/digest/digest-action-panel.tsx components/digest/digest-workspace.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/digest-workspace.test.tsx
git commit -m "feat: clarify digest product states"
```

### Acceptance Criteria

- Action result distinguishes `empty`, `local`, and `ai`.
- Digest task input persists the generated digest mode.
- Reloaded pages still display the correct digest mode.
- Status panel shows the digest mode.
- Empty state tells the user to generate the digest, not to configure unrelated workbench features.
- No-model fallback is presented as a valid local digest, not as a failure.
- When no articles exist, UI says there are no articles rather than implying the model failed.

---

## Task 5: Align README With The Current Product

**Files:**
- Modify: `README.md`
- Modify: `docs/goal-handoff.md`

### Implementation Idea

Update docs so future sessions optimize the current product instead of the old workbench. The README should state:

- Current main page is the tech digest MVP.
- Main loop: configure model, generate digest, read citations, open originals.
- Old Lens/source/Agent/sidebar concepts are not the current main page.
- Next core work is refresh details, digest quality, reading actions, and first-use states.

### Steps

- [ ] **Step 1: Update README opening and current status**

Replace the current "当前状态" paragraph with:

```md
当前状态：Narro 当前主路径已经收窄为“今日科技简报”MVP。首页读取默认科技源，支持配置 OpenAI-compatible 模型，点击“生成今日科技简报”后刷新固定 source pack，生成中文摘要，并在摘要下方显示可回链的引用文章。没有模型配置时，会生成本地 fallback 简报，保证基础功能可用。
```

- [ ] **Step 2: Update core direction**

Replace old bullets that say homepage is a real-time feed and Lens/Agent are primary with:

```md
## 核心方向

- 当前首页主体验是“生成并阅读今日科技简报”。
- 默认科技源先保持固定、小而稳定，不追求源数量。
- 摘要必须能回链到原文，引用编号要稳定。
- 模型不可用时也要生成本地可读简报。
- Lens、源管理、Agent 侧栏、事件组、OPML 等功能暂时不作为首页主功能。
```

- [ ] **Step 3: Update MVP usage**

Replace the old usage steps with:

```md
## MVP 使用方式

1. 打开 `http://localhost:3001`。
2. 在“模型设置”里填写 OpenAI-compatible `Base URL`、`Model` 和 `API Key`；不填写也可以先使用本地 fallback 简报。
3. 点击“生成今日科技简报”。
4. Narro 会刷新默认科技源，选择高信号文章，生成中文简报。
5. 阅读简报中的引用编号，并在“引用文章”区域打开原文。
```

- [ ] **Step 4: Add current next-work section**

Add:

```md
## 当前下一步

下一阶段只补基础功能产品能力：

- 显示每个默认科技源的刷新结果和失败原因。
- 提升 LLM prompt 与本地 fallback 摘要质量。
- 给引用文章增加复制简报、标记已读、隐藏噪声文章等阅读动作。
- 明确首次使用、无文章、本地简报、AI 简报、刷新失败等状态。

暂不处理部署、数据库迁移、多用户、后台定时任务、Source Directory、Lens 编辑器、事件组 UI、语义搜索或聊天问答。
```

- [ ] **Step 5: Replace stale goal handoff**

Replace `docs/goal-handoff.md` with:

````md
# Narro Goal Handoff

## 当前项目状态

Narro 当前主路径是“今日科技简报”MVP。首页只保留基础功能产品路径：模型设置、生成今日科技简报、阅读摘要、查看引用文章、打开原文。

旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选、信息流工作台不是当前首页主功能，后续不要在没有明确要求时重新加回首页。

## 当前推荐 Goal

```text
请进入 goal 模式，目标是按照 docs/superpowers/plans/2026-05-28-narro-core-product-followup.md 完成 Narro 基础功能产品后续优化。

重要约束：
- 只做基础功能产品可用性，不做部署、数据库迁移、多用户、后台定时任务、运维。
- 不要把旧的 Lens 侧栏、Source 管理侧栏、Agent 侧栏、事件组、OPML、高级筛选重新放回首页。
- 按文档任务顺序执行，使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务就提交一次。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build，通过后推送到 GitHub。
```

## 执行约束

- 优先完成主功能：生成、阅读、引用、反馈。
- 不讨论部署、迁移、维护作为当前缺口。
- 不扩大到 Source Directory、Lens 编辑器、语义搜索、聊天问答。
- 每个任务完成后运行对应测试。
- 最后一轮必须运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
````

- [ ] **Step 6: Verify docs references**

Run:

```powershell
rg -n "左侧|右侧 Agent|Lens 设置|OPML|实时信息流" README.md docs/goal-handoff.md
```

Expected result: docs should not describe these as current main-page features. They may mention them only as future or out-of-scope items.

- [ ] **Step 7: Commit**

```powershell
git add README.md docs/goal-handoff.md
git commit -m "docs: align readme with digest product"
```

### Acceptance Criteria

- README describes the simplified digest MVP accurately.
- README does not tell users to use non-rendered sidebar features.
- README clearly states current next work.
- Out-of-scope items remain out of the main product plan.

---

## Task 6: Full Verification And Push

**Files:**
- No planned code changes.

### Steps

- [ ] **Step 1: Run focused tests**

```powershell
pnpm test tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/digest-generator.test.ts tests/digest-topic-groups.test.ts tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
```

Expected result: all listed tests pass.

- [ ] **Step 2: Run full validation**

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

- [ ] **Step 3: Inspect diff**

```powershell
git status --short --branch
git diff --stat HEAD
```

Expected result: only planned files are changed.

- [ ] **Step 4: Push**

```powershell
git push
```

Expected result: current branch pushes to GitHub without rejection.

### Acceptance Criteria

- All verification commands pass.
- Work is committed in small topic commits.
- Current branch is pushed to GitHub.
- Homepage remains focused on the digest path.

---

## Overall Acceptance Criteria

The follow-up work is complete when all of these are true:

- User can click "生成今日科技简报" and see which default sources succeeded or failed.
- Refresh failures show source names and concise errors.
- Successful refresh details show fetched and inserted counts.
- Digest prompt is grouped and asks for concrete importance, not title repetition.
- Local fallback digest is sectioned and contains short "why it matters" explanations.
- Digest citations still link to the correct referenced articles.
- User can copy the digest.
- User can open referenced originals.
- User can mark a referenced article as read.
- User can hide a noisy referenced article from future digest selection.
- First-use, empty, local fallback, AI digest, and refresh failure states are visually distinguishable.
- README describes the current simplified digest product.
- No old source/sidebar/Lens/Agent/event/OPML UI returns to the homepage.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

---

## Goal-Mode Handoff Prompt

Use this exact prompt in a new goal-mode session:

```text
请进入 goal 模式，目标是按照 docs/superpowers/plans/2026-05-28-narro-core-product-followup.md 完成 Narro 基础功能产品后续优化。

重要约束：
- 只做基础功能产品可用性，不做部署、数据库迁移、多用户、后台定时任务、运维。
- 不要把旧的 Lens 侧栏、Source 管理侧栏、Agent 侧栏、事件组、OPML、高级筛选重新放回首页。
- 按文档任务顺序执行，使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务就提交一次。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build，通过后推送到 GitHub。
```

---

## Self-Review

- This plan is focused on main product usability, not productization or infrastructure.
- Every task has explicit files, test commands, implementation direction, and acceptance criteria.
- The plan keeps the simplified digest page as the product boundary.
- The plan uses existing server actions and repositories where possible.
- The plan avoids adding embeddings, scheduled workers, source management UI, or advanced workbench concepts.
