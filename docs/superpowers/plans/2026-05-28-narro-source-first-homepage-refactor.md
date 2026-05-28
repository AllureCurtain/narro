# Narro Source-First Homepage Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Narro homepage from an AI-digest-first flow into a source-data-first reading product where users can fetch, scan, open, read, and hide source articles before optionally generating a local or AI digest.

**Architecture:** Keep the simplified homepage and do not restore the old workbench sidebars. Split the current `DigestWorkspace` into a primary source article flow and secondary digest tools: source refresh is the main action, article stream is the main content, digest generation is optional, and model settings are collapsed under AI enhancement. Reuse the existing database, source pack, refresh functions, item state server action, digest generator, and citation parsing instead of adding new persistence or source-management UI.

**Tech Stack:** Next.js 16 App Router, React 19, Server Actions, TypeScript 6, Tailwind CSS 4, Vitest, Testing Library, existing libSQL/Drizzle repository layer, existing OpenAI-compatible LLM adapter.

---

## Product Decision

The current page overstates the model path:

- The first visible action is "生成今日科技简报".
- `ModelSettingsForm` is a prominent standalone card.
- `ArticleList` is named and framed as "引用文章", which makes raw source data feel subordinate to generated output.
- The empty digest state says "配置模型后点击生成", which implies model setup is a prerequisite even though local fallback exists.

The next product shape should be:

- First screen answers: "What source information has Narro collected?"
- Primary action answers: "Fetch the latest source articles."
- Digest answers: "Optional summary of the source data."
- Model settings answer: "Optional AI enhancement configuration."

This is not a return to the old Lens/source/Agent workbench. It is still a narrow tech-information page, but with the reading surface promoted above model configuration.

## Scope Guard

Do not implement:

- Source Directory UI.
- Source management sidebar.
- Lens sidebar or Lens editor.
- Agent sidebar.
- Event groups UI.
- OPML UI.
- Advanced filters.
- Multi-user accounts.
- Auth.
- Deployment, database migration tooling, background workers, or scheduled jobs.
- Chat, Q&A, semantic search, notifications, Docker, or operations dashboards.

Existing backend code and unused legacy components may remain if they are not mounted on the homepage.

## Current File Map

- `app/page.tsx`
  - Loads workspace data and digest items.
  - Renders `NarroWorkspace`.

- `components/app-shell/narro-workspace.tsx`
  - Renders `TopBar`.
  - Mounts `DigestWorkspace`.
  - Must continue to avoid old sidebar/workbench components.

- `components/digest/digest-workspace.tsx`
  - Current order: `DigestActionPanel`, `ModelSettingsForm`, `DigestCard`, `ArticleList`.
  - Needs to become the source-first composition point.

- `components/digest/digest-action-panel.tsx`
  - Current primary action: generate digest.
  - Should become secondary digest tool, not the top product action.

- `components/digest/model-settings-form.tsx`
  - Current prominent model settings card.
  - Should become a collapsed AI settings disclosure.

- `components/digest/article-list.tsx`
  - Current heading: "引用文章".
  - Should become the primary article stream.
  - Needs stable item anchors so digest citations can link into the source stream without making article order depend on citation order.

- `components/digest/digest-card.tsx`
  - Current digest display card.
  - Should remain as an optional summary card.
  - Citation links should target item anchors, not citation-index-only article rows.

- `app/actions.ts`
  - Current `generateTechDigestForDatabase` refreshes sources and generates digest in one action.
  - Needs a separate source refresh action so users can fetch data without creating a digest.

- Tests to update:
  - `tests/digest-action.test.ts`
  - `tests/digest-action-panel.test.tsx`
  - `tests/digest-workspace.test.tsx`
  - `tests/home-workspace.test.tsx`

## Target UX Contract

1. Homepage primary content is "最新文章", not "引用文章".
2. Primary action is "获取最新信息".
3. "生成今日科技简报" remains available but is visually secondary.
4. Model configuration is hidden inside a collapsed "AI 设置" disclosure.
5. Users can use the page without configuring a model:
   - fetch source data;
   - scan raw articles;
   - open originals;
   - mark read;
   - hide noisy articles;
   - generate local fallback digest if desired.
6. If an AI digest exists, display mode badge as secondary metadata.
7. Digest citation links continue to work by jumping to matching articles in the source stream.
8. Old Lens/source/Agent/event/OPML/high-filter UI must not be mounted by `app/page.tsx`.

---

## File Structure

### Create

- `components/digest/source-refresh-panel.tsx`
  - Client component for the primary "获取最新信息" action.
  - Uses a new `refreshTechSourcesAction`.
  - Shows source-level refresh details using existing `DigestActionStatus`.

- `tests/source-refresh-panel.test.tsx`
  - Unit coverage for primary refresh panel copy and source-result rendering.

### Modify

- `app/actions.ts`
  - Add `refreshTechSourcesForDatabase` and `refreshTechSourcesAction`.
  - Extract helper for mapping `RefreshResult[]` to `DigestSourceResult[]`.
  - Keep `generateTechDigestForDatabase` behavior, but reuse the mapping helper.

- `components/digest/digest-workspace.tsx`
  - Reorder layout into source-first flow.
  - Use source article stream as the main article list.
  - Keep digest card and model settings as secondary tools.

- `components/digest/article-list.tsx`
  - Rename visible heading via props.
  - Support stable article anchors by item id.
  - Remove citation index display from the primary source stream.

- `components/digest/digest-card.tsx`
  - Accept citation hrefs from `DigestWorkspace`.
  - Update empty copy to avoid implying model setup is required.

- `components/digest/digest-action-panel.tsx`
  - Make digest generation secondary in visual weight and text.
  - Keep status rendering export reusable by source refresh panel.

- `components/digest/model-settings-form.tsx`
  - Render as collapsed "AI 设置" disclosure.
  - Keep same server action and field names.

- `README.md`
  - Align product language with source-first flow.

- `docs/goal-handoff.md`
  - Update next goal language so future sessions do not re-promote model setup as first-run work.

---

## Task 1: Lock Source-First Homepage Contract

**Files:**
- Modify: `tests/digest-workspace.test.tsx`
- Modify: `tests/home-workspace.test.tsx`

### Intent

Write failing tests that describe the new product contract before changing UI. These tests should fail because the current homepage still renders model settings prominently, labels the article list as references, and makes digest generation the top action.

- [ ] **Step 1: Update workspace test to expect source-first order**

In `tests/digest-workspace.test.tsx`, update the first test from digest-first wording to source-first wording:

```tsx
test("renders source articles as the primary homepage content", () => {
  render(
    <NarroWorkspace
      agentTasks={[digestTask]}
      items={[item]}
      settings={{
        "llm.provider": "openai-compatible",
        "llm.baseUrl": "https://api.example.com/v1",
        "llm.model": "test-model"
      }}
      sources={[source]}
      summary={summary}
    />
  );

  const main = screen.getByRole("main", { name: "今日科技信息" });
  expect(within(main).getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
  expect(within(main).getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
  expect(within(main).getByRole("link", { name: /Show HN: Fast AI coding workspace/ })).toHaveAttribute("href", item.url);
  expect(within(main).getByRole("button", { name: /标记 .* 为已读/ })).toBeInTheDocument();
  expect(within(main).getByRole("button", { name: /隐藏 .*/ })).toBeInTheDocument();

  expect(within(main).queryByRole("heading", { name: "引用文章" })).not.toBeInTheDocument();
  expect(within(main).queryByText("模型设置")).not.toBeInTheDocument();
  expect(within(main).getByText("AI 设置")).toBeInTheDocument();

  expect(screen.queryByRole("navigation", { name: "信息源和视角" })).not.toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: "Agent 任务" })).not.toBeInTheDocument();
  expect(screen.queryByText("高级筛选")).not.toBeInTheDocument();
  expect(screen.queryByText("事件组与趋势")).not.toBeInTheDocument();
  expect(screen.queryByText("OPML")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add test that digest generation is secondary**

Add this test in `tests/digest-workspace.test.tsx`:

```tsx
test("keeps digest generation available as a secondary tool", () => {
  render(
    <NarroWorkspace
      agentTasks={[digestTask]}
      items={[item, secondItem]}
      settings={{}}
      sources={[source]}
      summary={summary}
    />
  );

  const main = screen.getByRole("main", { name: "今日科技信息" });
  const refreshButton = within(main).getByRole("button", { name: "获取最新信息" });
  const digestButton = within(main).getByRole("button", { name: "生成今日科技简报" });

  expect(refreshButton).toBeInTheDocument();
  expect(digestButton).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "今日科技简报" })).toBeInTheDocument();
});
```

- [ ] **Step 3: Update citation test for item-id anchors**

In `tests/digest-workspace.test.tsx`, change citation expectations so citations link to stable item anchors:

```tsx
expect(screen.getByRole("link", { name: "查看引用 1" })).toHaveAttribute("href", "#article-hn-1");
expect(screen.getByRole("link", { name: "查看引用 2" })).toHaveAttribute("href", "#article-hn-2");
expect(screen.getByTestId("article-hn-1")).toHaveTextContent("Show HN: Fast AI coding workspace");
expect(screen.getByTestId("article-hn-2")).toHaveTextContent("Google ships a new AI agent runtime");
```

- [ ] **Step 4: Update home integration test**

In `tests/home-workspace.test.tsx`, change the main homepage assertions:

```tsx
expect(screen.getByRole("main", { name: "今日科技信息" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
expect(screen.getByText("AI 设置")).toBeInTheDocument();
expect(screen.queryByText("模型设置")).not.toBeInTheDocument();
expect(screen.getByText("最新文章")).toBeInTheDocument();
expect(screen.queryByText("引用文章")).not.toBeInTheDocument();
```

In the persisted settings test, verify the fields are inside a collapsed disclosure rather than visible by default:

```tsx
const main = screen.getByRole("main", { name: "今日科技信息" });
const aiSettings = within(main).getByText("AI 设置");
expect(aiSettings).toBeInTheDocument();
expect(within(main).queryByDisplayValue("https://api.example.com/v1")).not.toBeInTheDocument();
expect(within(main).getByRole("link", { name: /Show HN: Fast local AI coding workspace/ })).toHaveAttribute(
  "href",
  "https://example.com/fast-local-ai-coding"
);
```

- [ ] **Step 5: Run tests and verify RED**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
```

Expected result:

- Fails because main is still named `今日科技简报`.
- Fails because `获取最新信息` does not exist.
- Fails because model settings fields are visible.
- Fails because article heading is still `引用文章`.

Do not modify production code until these failures are observed.

---

## Task 2: Add Source Refresh Action Without Generating Digest

**Files:**
- Modify: `app/actions.ts`
- Test: `tests/digest-action.test.ts`

### Intent

Users need a way to fetch source data without forcing a digest generation or model-adjacent flow. This action reuses the fixed `techDigestSourceIds` source pack, existing `refreshSource`, and existing `DigestActionState` shape for source-level details.

- [ ] **Step 1: Add failing action test**

In `tests/digest-action.test.ts`, import the new function:

```ts
import { generateTechDigestForDatabase, refreshTechSourcesForDatabase } from "@/app/actions";
```

Add this test:

```ts
test("refreshes tech sources without creating a digest task", async () => {
  const result = await refreshTechSourcesForDatabase(database, {
    fetcher: vi.fn(async () => new Response("service unavailable", { status: 503 }))
  });
  const tasks = await listAgentTasks(database, { lensId: "ai-coding", limit: 10 });

  expect(result.ok).toBe(false);
  expect(result.refreshedCount).toBe(8);
  expect(result.failedCount).toBe(8);
  expect(result.insertedCount).toBe(0);
  expect(result.message).toContain("8 个源刷新失败");
  expect(result.sourceResults).toHaveLength(8);
  expect(result.digestOutput).toBeUndefined();
  expect(tasks.filter((task) => task.type === "daily_brief")).toHaveLength(0);
});
```

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
pnpm test tests/digest-action.test.ts
```

Expected result:

- Fails because `refreshTechSourcesForDatabase` is not exported.

- [ ] **Step 3: Extract refresh helper in `app/actions.ts`**

In `app/actions.ts`, add this helper below `generateTechDigestAction` or above `generateTechDigestForDatabase`:

```ts
async function refreshTechSources(
  database: Awaited<ReturnType<typeof getDatabase>>,
  options: {
    fetcher?: typeof fetch;
  } = {}
) {
  const results = await Promise.all(
    techDigestSourceIds.map((sourceId) =>
      refreshSource(database, sourceId, {
        fetcher: options.fetcher,
        limit: 8,
        timeoutMs: 10000
      })
    )
  );
  const sources = await listRealSources(database);
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
  const sourceResults: DigestActionState["sourceResults"] = results.map((result) => ({
    error: result.error,
    fetchedCount: result.fetchedCount,
    insertedCount: result.insertedCount,
    ok: result.ok,
    sourceId: result.sourceId,
    sourceName: sourceNameById.get(result.sourceId) ?? result.sourceId
  }));

  return {
    failedCount: results.filter((result) => !result.ok).length,
    insertedCount: results.reduce((total, result) => total + result.insertedCount, 0),
    refreshedCount: results.length,
    sourceResults
  };
}
```

If TypeScript does not accept `Awaited<ReturnType<typeof getDatabase>>`, replace that parameter type with `NarroDatabase` and import it from `@/lib/db/client`:

```ts
import { getDatabase, type NarroDatabase } from "@/lib/db/client";
```

- [ ] **Step 4: Add `refreshTechSourcesForDatabase`**

Add this export in `app/actions.ts`:

```ts
export async function refreshTechSourcesForDatabase(
  database = getDatabase(),
  options: {
    fetcher?: typeof fetch;
  } = {}
): Promise<DigestActionState> {
  await prepareDatabase(database);
  const { failedCount, insertedCount, refreshedCount, sourceResults } = await refreshTechSources(database, options);

  return {
    failedCount,
    insertedCount,
    ok: failedCount === 0,
    refreshedCount,
    sourceResults,
    message:
      failedCount === 0
        ? `已获取最新信息，刷新 ${refreshedCount} 个源，新增 ${insertedCount} 条`
        : `已尝试获取最新信息；${failedCount} 个源刷新失败，新增 ${insertedCount} 条`
  };
}
```

- [ ] **Step 5: Add server action wrapper**

Add this export in `app/actions.ts`:

```ts
export async function refreshTechSourcesAction(previousState?: DigestActionState): Promise<DigestActionState> {
  void previousState;
  const database = getDatabase();
  const state = await refreshTechSourcesForDatabase(database);
  revalidatePath("/");
  return state;
}
```

- [ ] **Step 6: Refactor digest generation to reuse helper**

In `generateTechDigestForDatabase`, replace the inline refresh block with:

```ts
let refreshedCount = 0;
let failedCount = 0;
let insertedCount = 0;
let sourceResults: DigestActionState["sourceResults"] = [];

if (options.refresh !== false) {
  const refreshState = await refreshTechSources(database, {
    fetcher: options.fetcher
  });
  refreshedCount = refreshState.refreshedCount;
  failedCount = refreshState.failedCount;
  insertedCount = refreshState.insertedCount;
  sourceResults = refreshState.sourceResults;
}
```

Remove the old local `refreshResults` mapping and `sourceNameById` mapping from `generateTechDigestForDatabase`.

- [ ] **Step 7: Run tests and verify GREEN**

Run:

```powershell
pnpm test tests/digest-action.test.ts
pnpm typecheck
```

Expected result:

- The new refresh-only test passes.
- Existing digest generation tests still pass.
- TypeScript exits 0.

- [ ] **Step 8: Commit**

```powershell
git add app/actions.ts tests/digest-action.test.ts
git commit -m "feat: refresh source articles without digest"
```

---

## Task 3: Create Primary Source Refresh Panel

**Files:**
- Create: `components/digest/source-refresh-panel.tsx`
- Create: `tests/source-refresh-panel.test.tsx`
- Modify: `components/digest/digest-action-panel.tsx`

### Intent

Move the primary top action from digest generation to source refresh. The panel should clearly say it fetches default tech sources and can be used without model configuration.

- [ ] **Step 1: Write failing panel test**

Create `tests/source-refresh-panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SourceRefreshStatus } from "@/components/digest/source-refresh-panel";

describe("source refresh panel", () => {
  test("shows source refresh details without digest language", () => {
    render(
      <SourceRefreshStatus
        state={{
          failedCount: 1,
          insertedCount: 2,
          ok: true,
          refreshedCount: 2,
          message: "已尝试获取最新信息；1 个源刷新失败，新增 2 条",
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

    expect(screen.getByText("已尝试获取最新信息；1 个源刷新失败，新增 2 条")).toBeInTheDocument();
    expect(screen.getByText("Hacker News RSS")).toBeInTheDocument();
    expect(screen.getByText("8 抓取 / 2 新增")).toBeInTheDocument();
    expect(screen.getByText("Lobsters RSS")).toBeInTheDocument();
    expect(screen.getByText("HTTP 503")).toBeInTheDocument();
    expect(screen.queryByText("AI 简报")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
pnpm test tests/source-refresh-panel.test.tsx
```

Expected result:

- Fails because `source-refresh-panel.tsx` does not exist.

- [ ] **Step 3: Create `SourceRefreshPanel`**

Create `components/digest/source-refresh-panel.tsx`:

```tsx
"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { refreshTechSourcesAction } from "@/app/actions";
import type { DigestActionState } from "@/lib/domain";
import { DigestActionStatus } from "./digest-action-panel";

const initialState: DigestActionState = {
  ok: true,
  message: ""
};

export function SourceRefreshPanel() {
  const [state, formAction] = useActionState(refreshTechSourcesAction, initialState);

  return (
    <form action={formAction} className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">获取最新信息</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            刷新默认科技源，先把可读的原始文章放到下面。无需配置模型。
          </p>
        </div>
        <RefreshButton />
      </div>
      <SourceRefreshStatus state={state} />
    </form>
  );
}

export function SourceRefreshStatus({ state }: { state: DigestActionState }) {
  return <DigestActionStatus state={state} showMode={false} />;
}

function RefreshButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="获取最新信息"
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition active:translate-y-px disabled:cursor-wait disabled:opacity-80"
      disabled={pending}
      type="submit"
    >
      <ArrowClockwise size={16} aria-hidden="true" />
      {pending ? "获取中" : "获取最新信息"}
    </button>
  );
}
```

- [ ] **Step 4: Add `showMode` option to `DigestActionStatus`**

Modify the function signature in `components/digest/digest-action-panel.tsx`:

```tsx
export function DigestActionStatus({
  showMode = true,
  state
}: {
  showMode?: boolean;
  state: DigestActionState;
}) {
```

Update the mode pill condition:

```tsx
{showMode && state.mode ? (
  <StatusPill tone={state.mode === "empty" ? "warning" : "neutral"}>
    {state.mode === "ai" ? "AI 简报" : state.mode === "local" ? "本地简报" : "暂无可用文章"}
  </StatusPill>
) : null}
```

Update `hasStatusPills`:

```tsx
const hasStatusPills = hasCounts || Boolean(showMode && state.mode);
```

- [ ] **Step 5: Soften digest action panel copy**

In `components/digest/digest-action-panel.tsx`, change the top text:

```tsx
<p className="text-sm font-semibold text-slate-950">生成今日科技简报</p>
<p className="mt-1 text-xs leading-5 text-slate-500">
  可选：基于下面的文章生成中文简报。未配置模型时会使用本地摘要。
</p>
```

Change the form class to visually secondary:

```tsx
className="rounded-md border border-slate-200 bg-slate-50 p-3"
```

Change button class to secondary:

```tsx
className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition active:translate-y-px disabled:cursor-wait disabled:opacity-80"
```

- [ ] **Step 6: Run tests**

Run:

```powershell
pnpm test tests/source-refresh-panel.test.tsx tests/digest-action-panel.test.tsx
pnpm typecheck
```

Expected result:

- Source refresh panel test passes.
- Existing digest status tests pass.
- TypeScript exits 0.

- [ ] **Step 7: Commit**

```powershell
git add components/digest/source-refresh-panel.tsx components/digest/digest-action-panel.tsx tests/source-refresh-panel.test.tsx
git commit -m "feat: add source refresh panel"
```

---

## Task 4: Convert Article List Into Primary Source Stream

**Files:**
- Modify: `components/digest/article-list.tsx`
- Modify: `components/digest/digest-card.tsx`
- Modify: `tests/digest-workspace.test.tsx`

### Intent

The article list should display source articles as primary content, not only digest references. Digest citations should still jump to matching articles.

- [ ] **Step 1: Add failing article-list test expectations**

In `tests/digest-workspace.test.tsx`, ensure article rows are addressed by item id:

```tsx
expect(screen.getByTestId("article-hn-1")).toHaveTextContent("Show HN: Fast AI coding workspace");
expect(screen.getByTestId("article-hn-2")).toHaveTextContent("Google ships a new AI agent runtime");
expect(screen.queryByText("[1]")).not.toBeInTheDocument();
```

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result:

- Fails because article rows are still `article-ref-1` and `article-ref-2`.

- [ ] **Step 2: Update `ArticleListProps`**

In `components/digest/article-list.tsx`, replace the props interface:

```tsx
interface ArticleListProps {
  emptyMessage?: string;
  heading?: string;
  items: Item[];
  sources: Source[];
}
```

Update the component signature:

```tsx
export function ArticleList({
  emptyMessage = "还没有文章。点击获取最新信息会先刷新默认科技源。",
  heading = "最新文章",
  items,
  sources
}: ArticleListProps) {
```

- [ ] **Step 3: Change heading and empty message**

Replace the heading block in `ArticleList`:

```tsx
<h2 className="text-sm font-semibold text-slate-950" id="article-list-heading">
  {heading}
</h2>
```

Replace the empty paragraph:

```tsx
<p className="text-sm leading-6 text-slate-600">{emptyMessage}</p>
```

- [ ] **Step 4: Use stable article anchors**

Replace each article wrapper attributes:

```tsx
<article
  className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
  data-testid={articleDomId(item)}
  id={articleDomId(item)}
  key={item.id}
>
```

Remove the citation index span from the anchor. The anchor should become:

```tsx
<a className="flex min-w-0 gap-3 transition hover:bg-slate-50" href={item.url} rel="noreferrer" target="_blank">
  <span className="min-w-0 flex-1">
    <span className="block font-medium leading-5 text-slate-950">{item.title}</span>
    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
      <span>{sourceById.get(item.sourceId)?.name ?? item.sourceId}</span>
      <span> · </span>
      <span>{formatDate(item.publishedAt)}</span>
      <span> · </span>
      <span>{item.summary}</span>
    </span>
  </span>
  <ArrowSquareOut className="mt-1 shrink-0 text-slate-400" size={15} aria-hidden="true" />
</a>
```

Add helper:

```tsx
export function articleDomId(item: Pick<Item, "id">) {
  return `article-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
```

- [ ] **Step 5: Update digest citation links**

In `components/digest/digest-card.tsx`, add a prop:

```tsx
interface DigestCardProps {
  citationHrefs?: Map<number, string>;
  latestDigest?: AgentTask;
  mode?: DigestMode;
  referenceItems: Item[];
}
```

Update signature:

```tsx
export function DigestCard({ citationHrefs = new Map(), latestDigest, mode, referenceItems }: DigestCardProps) {
```

Pass `citationHrefs` into `DigestMarkdown`:

```tsx
<DigestMarkdown citationHrefs={citationHrefs} output={output} referenceItems={referenceItems} />
```

Update `DigestMarkdown` signature:

```tsx
function DigestMarkdown({
  citationHrefs,
  output,
  referenceItems
}: {
  citationHrefs: Map<number, string>;
  output: string;
  referenceItems: Item[];
}) {
```

Update `CitationLink` usage:

```tsx
<CitationLink exists={reference <= referenceItems.length} href={citationHrefs.get(reference)} key={reference} reference={reference} />
```

Update `CitationLink`:

```tsx
function CitationLink({ exists, href, reference }: { exists: boolean; href?: string; reference: number }) {
  const className = [
    "inline-flex min-h-6 items-center rounded-md px-1.5 font-mono text-[11px] font-medium",
    exists && href ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : "bg-amber-100 text-amber-800"
  ].join(" ");

  if (!exists || !href) {
    return <span className={className}>[{reference}]</span>;
  }

  return (
    <a aria-label={`查看引用 ${reference}`} className={className} href={href}>
      [{reference}]
    </a>
  );
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
pnpm typecheck
```

Expected result:

- Tests may still fail until `DigestWorkspace` passes `citationHrefs`. That is expected in this task if failures point to missing props or wrong hrefs.

- [ ] **Step 7: Commit if isolated tests pass**

Only commit after Task 5 has wired `DigestWorkspace` if this task depends on it. If this task is implemented together with Task 5, commit once after both are green.

---

## Task 5: Recompose `DigestWorkspace` Into Source-First Layout

**Files:**
- Modify: `components/digest/digest-workspace.tsx`
- Modify: `tests/digest-workspace.test.tsx`
- Modify: `tests/home-workspace.test.tsx`

### Intent

This is the main product refactor. It changes the visible order while preserving the simple homepage boundary.

- [ ] **Step 1: Import new pieces**

In `components/digest/digest-workspace.tsx`, add:

```tsx
import { articleDomId } from "./article-list";
import { SourceRefreshPanel } from "./source-refresh-panel";
```

- [ ] **Step 2: Compute stream items independently from digest references**

Replace the current `displayedItems` calculation with:

```tsx
const streamItems = uniqueItemsById([...items.slice(0, 40), ...referenceItems]);
const citationHrefs = new Map(
  referenceItems.map((item, index) => [index + 1, `#${articleDomId(item)}`])
);
```

Add helper below `itemsFromStoredReferenceIds`:

```tsx
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

- [ ] **Step 3: Replace workspace JSX**

Replace the return block in `DigestWorkspace`:

```tsx
return (
  <main aria-label="今日科技信息" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
    <SourceRefreshPanel />
    <ArticleList
      emptyMessage="还没有文章。点击获取最新信息会先刷新默认科技源。"
      heading="最新文章"
      items={streamItems}
      sources={sources}
    />
    <section aria-label="简报工具" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <DigestCard citationHrefs={citationHrefs} latestDigest={latestDigest} mode={digestMode} referenceItems={referenceItems} />
      <div className="grid gap-3 content-start">
        <DigestActionPanel />
        <ModelSettingsForm settings={settings} />
      </div>
    </section>
  </main>
);
```

This keeps digest and AI settings available but moves them below the source stream.

- [ ] **Step 4: Run source-first tests**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx tests/home-workspace.test.tsx tests/source-refresh-panel.test.tsx
```

Expected result:

- Workspace and home tests pass after Task 6 collapses model settings.
- If this fails only because model fields are still visible, proceed to Task 6 before committing.

---

## Task 6: Collapse Model Settings Into Optional AI Settings

**Files:**
- Modify: `components/digest/model-settings-form.tsx`
- Modify: `tests/home-workspace.test.tsx`
- Modify: `tests/digest-workspace.test.tsx`

### Intent

Model configuration should be available but not presented as required setup. Use native `<details>` so no extra client state is needed.

- [ ] **Step 1: Add failing test for collapsed model settings**

In `tests/digest-workspace.test.tsx`, add:

```tsx
test("keeps model settings collapsed as optional AI settings", () => {
  render(
    <NarroWorkspace
      agentTasks={[]}
      items={[item]}
      settings={{
        "llm.provider": "openai-compatible",
        "llm.baseUrl": "https://api.example.com/v1",
        "llm.model": "test-model"
      }}
      sources={[source]}
      summary={summary}
    />
  );

  const main = screen.getByRole("main", { name: "今日科技信息" });
  expect(within(main).getByText("AI 设置")).toBeInTheDocument();
  expect(within(main).queryByDisplayValue("https://api.example.com/v1")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx
```

Expected result:

- Fails because current model fields are visible.

- [ ] **Step 3: Replace `ModelSettingsForm` wrapper**

In `components/digest/model-settings-form.tsx`, replace the component return with:

```tsx
return (
  <details className="rounded-md border border-slate-200 bg-white p-3">
    <summary className="cursor-pointer text-sm font-semibold text-slate-950">
      AI 设置
    </summary>
    <p className="mt-2 text-xs leading-5 text-slate-500">
      可选配置。未填写模型时，Narro 仍可获取文章并生成本地简报。
    </p>
    <form action={saveLlmSettingsAction} className="mt-3 grid gap-2">
      <Field defaultValue={settings["llm.provider"] ?? "openai-compatible"} label="Provider" name="provider" />
      <Field
        defaultValue={settings["llm.baseUrl"] ?? ""}
        label="Base URL"
        name="baseUrl"
        placeholder="https://api.openai.com/v1"
      />
      <Field defaultValue={settings["llm.model"] ?? ""} label="Model" name="model" placeholder="gpt-5-mini" />
      <Field label="API Key" name="apiKey" placeholder={settings["llm.apiKey"] ? "已保存，留空不修改" : "sk-..."} type="password" />
      <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700" type="submit">
        保存
      </button>
    </form>
  </details>
);
```

- [ ] **Step 4: Update empty digest copy**

In `components/digest/digest-card.tsx`, replace:

```tsx
<p className="mt-1">配置模型后点击生成；没有模型时也会先生成本地可读摘要。</p>
```

with:

```tsx
<p className="mt-1">可以先阅读下方文章；需要摘要时再生成简报，未配置模型也会使用本地摘要。</p>
```

- [ ] **Step 5: Run tests**

Run:

```powershell
pnpm test tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
pnpm typecheck
```

Expected result:

- Model settings are collapsed.
- Source-first home tests pass.
- TypeScript exits 0.

- [ ] **Step 6: Commit Tasks 4-6 together if they were coupled**

```powershell
git add components/digest/article-list.tsx components/digest/digest-card.tsx components/digest/digest-workspace.tsx components/digest/model-settings-form.tsx tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
git commit -m "feat: make homepage source first"
```

---

## Task 7: Preserve Digest Generation As Optional Enhancement

**Files:**
- Modify: `tests/digest-action.test.ts`
- Modify: `tests/digest-generator.test.ts`
- Modify: `tests/digest-workspace.test.tsx`

### Intent

The refactor must not remove the digest feature. It only changes priority.

- [ ] **Step 1: Add regression test that local digest still works without model settings**

In `tests/digest-action.test.ts`, ensure this existing assertion remains in `generates and persists a digest from existing items`:

```ts
expect(result.mode).toBe("local");
expect(result.digestOutput).toContain("Show HN: AI coding browser");
expect(parseDigestTaskReferenceIds(tasks[0].input)).toEqual(["digest-hn-1"]);
```

- [ ] **Step 2: Add workspace test that digest card is below article stream**

In `tests/digest-workspace.test.tsx`, add:

```tsx
test("renders articles before optional digest tools in document order", () => {
  render(
    <NarroWorkspace
      agentTasks={[digestTask]}
      items={[item]}
      settings={{}}
      sources={[source]}
      summary={summary}
    />
  );

  const articleHeading = screen.getByRole("heading", { name: "最新文章" });
  const digestHeading = screen.getByRole("heading", { name: "今日科技简报" });
  const position = articleHeading.compareDocumentPosition(digestHeading);

  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

- [ ] **Step 3: Run regression suite**

Run:

```powershell
pnpm test tests/digest-action.test.ts tests/digest-generator.test.ts tests/digest-workspace.test.tsx
```

Expected result:

- Digest action tests pass.
- Generator tests pass.
- Workspace order test passes.

- [ ] **Step 4: Commit if changes were needed**

```powershell
git add tests/digest-action.test.ts tests/digest-generator.test.ts tests/digest-workspace.test.tsx
git commit -m "test: preserve optional digest flow"
```

If no files changed in this task, do not create an empty commit.

---

## Task 8: Update Product Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/goal-handoff.md`

### Intent

The docs should stop describing the primary loop as model configuration followed by digest generation. They should describe source-first reading with optional digest generation.

- [ ] **Step 1: Update README current status**

Replace the current status paragraph with:

```md
当前状态：Narro 当前主路径是“获取并阅读科技信息”。首页会刷新固定默认科技源，把最新文章作为第一屏主要内容展示；用户可以直接阅读标题、摘要、来源、发布时间并打开原文。生成今日科技简报仍然可用，但属于基于已获取文章的可选增强；未配置模型时会使用本地 fallback 简报。OpenAI-compatible 模型设置收在“AI 设置”中，不是首次使用前提。
```

- [ ] **Step 2: Update README core direction**

Replace the core direction bullets with:

```md
## 核心方向

- 当前首页主体验是“获取最新信息并阅读源文章”。
- 默认科技源保持固定、小而稳定，不追求源数量。
- 原始文章列表是基础产品能力，摘要和 AI 简报是增强能力。
- 摘要必须能回链到原文，引用编号要稳定。
- 模型不可用时也要能刷新文章、阅读文章、生成本地简报。
- Lens、源管理、Agent 侧栏、事件组、OPML 等功能暂时不作为首页主功能。
```

- [ ] **Step 3: Update README MVP usage**

Replace usage steps with:

```md
## MVP 使用方式

1. 打开 `http://localhost:3001`。
2. 点击“获取最新信息”，Narro 会刷新默认科技源并显示最新文章。
3. 在“最新文章”中阅读标题、摘要、来源和发布时间，按需打开原文。
4. 对已读或噪声文章使用“已读”和“隐藏”。
5. 需要摘要时点击“生成今日科技简报”；没有模型配置也会生成本地 fallback 简报。
6. 需要 AI 简报时展开“AI 设置”，填写 OpenAI-compatible `Base URL`、`Model` 和 `API Key`。
```

- [ ] **Step 4: Update goal handoff**

In `docs/goal-handoff.md`, replace the project status with:

```md
Narro 当前主路径是“获取并阅读科技信息”。首页只保留基础功能产品路径：获取最新信息、阅读源文章、打开原文、标记已读、隐藏噪声文章，以及可选生成今日科技简报。
```

Replace execution constraints with:

```md
- 优先完成主功能：获取、阅读、打开原文、已读、隐藏。
- 简报和 AI 模型设置是增强能力，不要压过源文章阅读。
- 不讨论部署、迁移、维护作为当前缺口。
- 不扩大到 Source Directory、Lens 编辑器、语义搜索、聊天问答。
- 每个任务完成后运行对应测试。
```

- [ ] **Step 5: Verify stale docs**

Run:

```powershell
rg -n "先配置模型|配置模型后点击生成|模型设置\"|引用文章\"|首页主体验是“生成并阅读今日科技简报”" README.md docs/goal-handoff.md
```

Expected result:

- No matches.

- [ ] **Step 6: Commit**

```powershell
git add README.md docs/goal-handoff.md
git commit -m "docs: describe source first homepage"
```

---

## Task 9: Full Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Run focused tests**

```powershell
pnpm test tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/source-refresh-panel.test.tsx tests/digest-generator.test.ts tests/digest-topic-groups.test.ts tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
```

Expected result:

- All listed test files pass.

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

- [ ] **Step 3: Confirm homepage has not remounted old UI**

Run:

```powershell
rg -n "SourceLensSidebar|AgentSidebar|FeedWorkspace|source-lens-sidebar|agent-sidebar|feed-workspace|信息源和视角|Agent 任务|事件组与趋势|OPML|高级筛选" app components/app-shell components/digest
```

Expected result:

- No matches in `app`, `components/app-shell`, or `components/digest`.

- [ ] **Step 4: Inspect status**

```powershell
git status --short --branch
git log --oneline -8 --decorate
```

Expected result:

- Worktree is clean after the final commit.
- Recent commits show one commit per completed implementation task.

---

## Acceptance Criteria

The refactor is complete when all of these are true:

- Homepage main landmark is `今日科技信息`.
- First primary button is `获取最新信息`.
- Source article list is visible before digest tools.
- Article list heading is `最新文章`.
- Article rows show title, source, published date, summary, open-original link, read action, and hide action.
- Users can refresh source data without generating a digest task.
- Digest generation still works as an optional action.
- Local fallback digest still works without model settings.
- Existing AI digest generation still works when model settings are configured.
- Model settings are collapsed under `AI 设置` and not visually presented as required setup.
- Digest citations link to stable source article anchors.
- Empty state tells users to fetch latest information first.
- README and handoff docs describe source-first reading as the current main product.
- Old Lens/source sidebar, Agent sidebar, event groups, OPML UI, and advanced filters are not mounted on the homepage.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## Self-Review

- This plan changes product priority without widening scope into source management or old workbench features.
- It separates raw source refresh from digest generation so model configuration is no longer implied as a prerequisite.
- It keeps existing database and ingestion architecture.
- It preserves digest generation, local fallback, citations, article actions, and source refresh details.
- It uses TDD at each behavioral boundary before production changes.
