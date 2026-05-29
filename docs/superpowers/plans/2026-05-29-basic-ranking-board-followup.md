# Basic Ranking Board Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the basic Narro category ranking board product path by aligning refresh coverage, search states, item action feedback, digest citation anchors, and persistent refresh status.

**Architecture:** Keep the existing five-category ranking board as the homepage. Add one pure ranking source pack, extend the existing ranking workspace props, reuse existing repository refresh logs and item state actions, and keep digest tools below the board. Do not add database migrations or reintroduce the old Source/Lens/Agent/Event/OPML/advanced-filter homepage UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Phosphor icons, Server Actions, Vitest, Testing Library, existing libSQL/Drizzle repository layer.

---

## Source Documents

- Current ranking plan: `docs/superpowers/plans/2026-05-29-category-ranking-board.md`
- Current ranking workspace: `components/rankings/category-board-workspace.tsx`
- Current ranking data helper: `lib/rankings/category-board.ts`
- Current ranking row: `components/rankings/category-ranking-row.tsx`
- Current refresh actions: `app/actions.ts`
- Current digest source pack: `lib/digest/source-pack.ts`
- Current repository layer: `lib/db/repositories.ts`
- Current homepage tests: `tests/home-workspace.test.tsx`
- Current ranking workspace tests: `tests/category-board-workspace.test.tsx`

## Scope Guard

Only complete the current basic homepage path:

1. Get latest information.
2. Browse five category rankings.
3. Open original articles.
4. Mark read and hide noise.
5. Optionally generate a digest with stable citations.
6. Understand search, empty, and refresh failure states.

Do not add Source Directory, Lens editing, Agent sidebars, event groups, OPML UI, advanced filters, semantic search, chat, deployment work, background scheduling, database migrations, or third-party TopHub scraping.

The old backend functions and unused legacy components may remain. The homepage must not mount `SourceLensSidebar`, `AgentSidebar`, `FeedWorkspace`, event group UI, OPML UI, or advanced filters.

## File Structure

### Create

- `lib/rankings/category-source-pack.ts`
  - Pure list of source IDs used by the category ranking board refresh flow.

- `tests/category-source-pack.test.ts`
  - Unit tests proving the ranking refresh source pack covers all five categories.

### Modify

- `app/actions.ts`
  - Use `rankingBoardSourceIds` for `refreshTechSourcesForDatabase` / `refreshTechSourcesAction`.
  - Keep digest selection on `selectDigestEntries`; do not broaden digest article selection unless a later task explicitly needs it.
  - Optionally add a small item action state action if Task 3 uses `useActionState`.

- `app/page.tsx`
  - Pass `searchQuery` and `workspace.refreshLogs` into `NarroWorkspace`.

- `components/app-shell/narro-workspace.tsx`
  - Accept and forward `refreshLogs`.

- `components/rankings/category-board-workspace.tsx`
  - Accept `searchQuery` and `refreshLogs`.
  - Render search state and clear-search link.
  - Render batch-read form for currently visible ranked items.
  - Render a compact digest reference fallback section for cited articles that do not appear in top-10 ranking rows.

- `components/rankings/category-ranking-row.tsx`
  - Add clear read-state styling and status.
  - Preserve open-original, read, and hide actions.

- `components/digest/source-refresh-panel.tsx`
  - Accept recent refresh logs and render persistent refresh summary.

- `tests/category-board-workspace.test.tsx`
  - Add coverage for search state, batch read, digest citation fallback, and recent refresh status.

- `tests/category-ranking-card.test.tsx`
  - Add read-state rendering assertions.

- `tests/digest-action.test.ts`
  - Update refresh count expectations to use the ranking board source pack.

- `tests/home-workspace.test.tsx`
  - Add homepage integration assertions for search state and persistent refresh summary.

- `README.md`
  - Update current next-step notes after these basics are implemented.

- `docs/goal-handoff.md`
  - Update the handoff to point to this plan while work is active.

## Task 1: Align Ranking Refresh Source Coverage

**Files:**
- Create: `lib/rankings/category-source-pack.ts`
- Create: `tests/category-source-pack.test.ts`
- Modify: `app/actions.ts`
- Modify: `tests/digest-action.test.ts`

- [ ] **Step 1: Write the failing source pack tests**

Create `tests/category-source-pack.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { rankingBoardSourceIds, rankingBoardSourceIdsByCategory } from "@/lib/rankings/category-source-pack";
import { categoryDefinitions } from "@/lib/rankings/category-board";

describe("category ranking source pack", () => {
  test("covers every visible ranking category with at least two refresh sources", () => {
    expect(Object.keys(rankingBoardSourceIdsByCategory)).toEqual(categoryDefinitions.map((category) => category.id));

    for (const category of categoryDefinitions) {
      expect(rankingBoardSourceIdsByCategory[category.id].length, `${category.id} source count`).toBeGreaterThanOrEqual(2);
    }
  });

  test("deduplicates ranking board refresh source ids in display priority order", () => {
    expect(rankingBoardSourceIds).toEqual([...new Set(rankingBoardSourceIds)]);
    expect(rankingBoardSourceIds.slice(0, 6)).toEqual([
      "hacker-news-rss",
      "lobsters-rss",
      "hugging-face-blog",
      "google-ai-blog",
      "aws-machine-learning-blog",
      "ollama-blog"
    ]);
    expect(rankingBoardSourceIds).toContain("react-blog");
    expect(rankingBoardSourceIds).toContain("github-changelog");
    expect(rankingBoardSourceIds).toContain("infoq-cn");
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```powershell
pnpm test tests/category-source-pack.test.ts
```

Expected result: fails because `@/lib/rankings/category-source-pack` does not exist.

- [ ] **Step 3: Implement the ranking source pack**

Create `lib/rankings/category-source-pack.ts`:

```ts
import type { CategoryId } from "@/lib/rankings/category-board";

export const rankingBoardSourceIdsByCategory: Record<CategoryId, string[]> = {
  "ai-models": [
    "hugging-face-blog",
    "google-ai-blog",
    "aws-machine-learning-blog",
    "ollama-blog"
  ],
  "developer-community": [
    "hacker-news-rss",
    "lobsters-rss"
  ],
  "engineering-open-source": [
    "github-engineering",
    "react-blog",
    "nextjs-blog",
    "nodejs-blog",
    "nodejs-releases",
    "typescript-blog",
    "tailwind-css-blog",
    "cloudflare-blog"
  ],
  "product-platform": [
    "github-changelog",
    "vercel-changelog",
    "stripe-blog",
    "apple-developer-news"
  ],
  "chinese-tech": [
    "ruanyifeng-weekly",
    "sspai",
    "infoq-cn",
    "meituan-tech",
    "solidot"
  ]
};

export const rankingBoardSourceIds = [
  ...rankingBoardSourceIdsByCategory["developer-community"],
  ...rankingBoardSourceIdsByCategory["ai-models"],
  ...rankingBoardSourceIdsByCategory["engineering-open-source"],
  ...rankingBoardSourceIdsByCategory["product-platform"],
  ...rankingBoardSourceIdsByCategory["chinese-tech"]
].filter((sourceId, index, sourceIds) => sourceIds.indexOf(sourceId) === index);

export const rankingBoardSourceIdSet = new Set<string>(rankingBoardSourceIds);
```

- [ ] **Step 4: Update refresh action tests first**

Modify `tests/digest-action.test.ts`:

```ts
import { rankingBoardSourceIds } from "@/lib/rankings/category-source-pack";
```

Replace hardcoded `8` expectations in the two refresh-failure tests with `rankingBoardSourceIds.length`:

```ts
expect(result.failedCount).toBe(rankingBoardSourceIds.length);
expect(result.message).toContain(`${rankingBoardSourceIds.length} 个源刷新失败`);
expect(result.sourceResults).toHaveLength(rankingBoardSourceIds.length);
```

For the refresh-only test:

```ts
expect(result.refreshedCount).toBe(rankingBoardSourceIds.length);
expect(result.failedCount).toBe(rankingBoardSourceIds.length);
expect(result.message).toContain(`${rankingBoardSourceIds.length} 个源刷新失败`);
expect(result.sourceResults).toHaveLength(rankingBoardSourceIds.length);
```

- [ ] **Step 5: Run tests and verify they fail before wiring**

Run:

```powershell
pnpm test tests/category-source-pack.test.ts tests/digest-action.test.ts
```

Expected result: source pack tests pass, digest action tests fail because refresh still uses the old `techDigestSourceIds` count.

- [ ] **Step 6: Wire refresh to ranking board sources**

Modify `app/actions.ts`.

Add:

```ts
import { rankingBoardSourceIds } from "@/lib/rankings/category-source-pack";
```

Keep this import:

```ts
import { selectDigestEntries } from "@/lib/digest/source-pack";
```

Remove `techDigestSourceIds` from the digest import.

Inside `refreshTechSources`, replace:

```ts
techDigestSourceIds.map((sourceId) =>
```

with:

```ts
rankingBoardSourceIds.map((sourceId) =>
```

Do not rename `refreshTechSourcesAction`; the UI already depends on that action name.

- [ ] **Step 7: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-source-pack.test.ts tests/digest-action.test.ts tests/category-board.test.ts
pnpm typecheck
```

Expected result: both commands pass.

- [ ] **Step 8: Commit**

```powershell
git add app/actions.ts lib/rankings/category-source-pack.ts tests/category-source-pack.test.ts tests/digest-action.test.ts
git commit -m "feat: align ranking board refresh sources"
```

## Task 2: Add Search State And Search Empty UX

**Files:**
- Modify: `components/app-shell/narro-workspace.tsx`
- Modify: `components/rankings/category-board-workspace.tsx`
- Modify: `app/page.tsx`
- Modify: `tests/category-board-workspace.test.tsx`
- Modify: `tests/home-workspace.test.tsx`

- [ ] **Step 1: Write failing workspace tests for search state**

In `tests/category-board-workspace.test.tsx`, add:

```tsx
test("shows search context and a clear link when filtering rankings", () => {
  render(<CategoryBoardWorkspace agentTasks={[]} items={items} searchQuery="compiler" settings={{}} sources={sources} />);

  const main = screen.getByRole("main", { name: "科技热榜" });
  expect(within(main).getByText("搜索：compiler")).toBeInTheDocument();
  expect(within(main).getByRole("link", { name: "清除搜索" })).toHaveAttribute("href", "/");
});

test("uses a search-specific empty state when filtered rankings have no results", () => {
  render(<CategoryBoardWorkspace agentTasks={[]} items={[]} searchQuery="definitely-no-hit" settings={{}} sources={sources} />);

  expect(screen.getByText("当前搜索没有匹配文章。请调整关键词或清除搜索。")).toBeInTheDocument();
  expect(screen.queryByText("暂无内容。点击获取最新信息后，这里会显示该分类的热榜。")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing homepage integration test for search state**

In `tests/home-workspace.test.tsx`, add a test:

```tsx
test("renders search context on the homepage", async () => {
  process.env.NARRO_DB_URL = "file::memory:";
  await closeDatabase();

  const database = getDatabase();
  await prepareDatabase(database);
  await insertItemIfNew(
    database,
    {
      id: "search-react-item",
      sourceId: "react-blog",
      title: "React compiler runtime update",
      url: "https://example.com/react-compiler",
      author: "React Blog",
      publishedAt: "2026-05-22T08:30:00.000Z",
      fetchedAt: "2026-05-22T09:00:00.000Z",
      summary: "Compiler details for React developers.",
      aiSummary: "",
      language: "en",
      tags: ["framework"],
      entities: ["React"],
      importanceScore: 88,
      readStatus: "unread",
      saved: false,
      hidden: false,
      reason: "test fixture",
      actionLabels: ["打开原文"]
    },
    "react-compiler-1"
  );

  const { default: Home } = await import("@/app/page");
  render(await Home({ searchParams: Promise.resolve({ q: "compiler" }) }));

  const main = screen.getByRole("main", { name: "科技热榜" });
  expect(within(main).getByText("搜索：compiler")).toBeInTheDocument();
  expect(within(main).getByRole("link", { name: /React compiler runtime update/ })).toBeInTheDocument();

  await closeDatabase();
}, 60000);
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx tests/home-workspace.test.tsx
```

Expected result: fails because `CategoryBoardWorkspace` does not accept or render `searchQuery`.

- [ ] **Step 4: Pass search query through app shell**

Modify `components/app-shell/narro-workspace.tsx`:

```tsx
<CategoryBoardWorkspace
  agentTasks={agentTasks}
  items={items}
  searchQuery={searchQuery}
  settings={settings}
  sources={sources}
/>
```

- [ ] **Step 5: Add search props and search-state rendering**

Modify `components/rankings/category-board-workspace.tsx`.

Update props:

```tsx
interface CategoryBoardWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  searchQuery?: string;
  settings: Record<string, string>;
  sources: Source[];
}
```

Update function signature:

```tsx
export function CategoryBoardWorkspace({ agentTasks, items, searchQuery, settings, sources }: CategoryBoardWorkspaceProps) {
```

After `const board = buildCategoryBoard({ items: boardItems, sources });`, add:

```tsx
const normalizedSearchQuery = searchQuery?.trim();
const isSearching = Boolean(normalizedSearchQuery);
const emptyMessage = isSearching
  ? "当前搜索没有匹配文章。请调整关键词或清除搜索。"
  : "暂无内容。点击获取最新信息后，这里会显示该分类的热榜。";
```

Inside the title section, after the summary paragraph, add:

```tsx
{isSearching ? (
  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
    <span className="rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700">
      搜索：{normalizedSearchQuery}
    </span>
    <a className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50" href="/">
      清除搜索
    </a>
  </div>
) : null}
```

When rendering cards, pass the message:

```tsx
<CategoryRankingCard category={category} emptyMessage={emptyMessage} />
```

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx tests/home-workspace.test.tsx tests/digest-workspace.test.tsx
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 7: Commit**

```powershell
git add app/page.tsx components/app-shell/narro-workspace.tsx components/rankings/category-board-workspace.tsx tests/category-board-workspace.test.tsx tests/home-workspace.test.tsx
git commit -m "feat: clarify ranking search state"
```

## Task 3: Improve Read State And Batch Read Actions

**Files:**
- Modify: `components/rankings/category-ranking-row.tsx`
- Modify: `components/rankings/category-board-workspace.tsx`
- Modify: `tests/category-ranking-card.test.tsx`
- Modify: `tests/category-board-workspace.test.tsx`

- [ ] **Step 1: Write failing read-state row test**

In `tests/category-ranking-card.test.tsx`, add:

```tsx
test("renders a clear read state for read articles", () => {
  render(
    <CategoryRankingCard
      category={{
        ...ranking,
        items: [
          {
            item: { ...item, readStatus: "read" },
            source,
            rank: 1
          }
        ]
      }}
    />
  );

  const card = screen.getByRole("region", { name: "开发者社区" });
  expect(within(card).getByText("已读")).toBeInTheDocument();
  expect(within(card).getByTestId("article-hn-1")).toHaveAttribute("data-read-status", "read");
});
```

- [ ] **Step 2: Write failing batch-read workspace test**

In `tests/category-board-workspace.test.tsx`, add:

```tsx
test("can mark the currently ranked articles as read", () => {
  render(<CategoryBoardWorkspace agentTasks={[]} items={items} settings={{}} sources={sources} />);

  const main = screen.getByRole("main", { name: "科技热榜" });
  expect(within(main).getByRole("button", { name: "标记当前榜单为已读" })).toBeInTheDocument();
  expect(within(main).getByDisplayValue("ai-1,community-1,engineering-1,platform-1,zh-1")).toHaveAttribute("name", "itemIds");
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
pnpm test tests/category-ranking-card.test.tsx tests/category-board-workspace.test.tsx
```

Expected result: fails because read-state attributes and batch-read form do not exist.

- [ ] **Step 4: Add read-state styling to ranking rows**

Modify `components/rankings/category-ranking-row.tsx`.

Add:

```tsx
const isRead = item.readStatus === "read";
```

Update the `<article>` element:

```tsx
<article
  className={[
    "grid gap-2 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]",
    isRead ? "opacity-70" : ""
  ].join(" ")}
  data-read-status={item.readStatus}
  data-testid={categoryArticleDomId(item)}
  id={categoryArticleDomId(item)}
>
```

Update the title class:

```tsx
<h3 className={["line-clamp-2 text-sm font-semibold leading-5", isRead ? "text-slate-500" : "text-slate-950"].join(" ")}>
  {item.title}
</h3>
```

After the importance score span, add:

```tsx
{isRead ? <span className="rounded bg-slate-100 px-1.5 text-slate-500">已读</span> : null}
```

- [ ] **Step 5: Add batch-read form to workspace**

Modify `components/rankings/category-board-workspace.tsx`.

Add import:

```tsx
import { markVisibleItemsReadAction } from "@/app/actions";
```

After `renderedItemIds`, add:

```tsx
const renderedItemIdList = [...renderedItemIds];
```

Inside the board title section, near the metric pills, add:

```tsx
{renderedItemIdList.length > 0 ? (
  <form action={markVisibleItemsReadAction}>
    <input name="itemIds" type="hidden" value={renderedItemIdList.join(",")} />
    <button
      className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
      type="submit"
    >
      标记当前榜单为已读
    </button>
  </form>
) : null}
```

Keep this action visible only when there is at least one rendered ranked item.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-ranking-card.test.tsx tests/category-board-workspace.test.tsx tests/database-ingestion.test.ts
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 7: Commit**

```powershell
git add components/rankings/category-ranking-row.tsx components/rankings/category-board-workspace.tsx tests/category-ranking-card.test.tsx tests/category-board-workspace.test.tsx
git commit -m "feat: improve ranking item read actions"
```

## Task 4: Stabilize Digest Citation Anchors

**Files:**
- Modify: `components/rankings/category-board-workspace.tsx`
- Modify: `tests/category-board-workspace.test.tsx`
- Modify: `tests/digest-workspace.test.tsx`

- [ ] **Step 1: Write failing citation fallback test**

In `tests/category-board-workspace.test.tsx`, add:

```tsx
test("keeps digest citations linked when referenced items are outside category top ten", () => {
  const crowdedItems = [
    ...Array.from({ length: 11 }, (_, index) =>
      item({
        id: `hn-crowded-${index}`,
        sourceId: "hacker-news-rss",
        title: `Crowded community story ${index}`,
        importanceScore: 100 - index
      })
    ),
    item({
      id: "digest-only",
      sourceId: "hacker-news-rss",
      title: "Digest only reference",
      importanceScore: 1
    })
  ];
  const digestOnlyTask: AgentTask = {
    ...digestTask,
    input: JSON.stringify({
      kind: "tech_digest",
      label: "今日科技简报",
      mode: "local",
      referenceItemIds: ["digest-only"]
    }),
    output: "## 今日重点\n- [1] Digest only reference 仍然需要可回链。"
  };

  render(<CategoryBoardWorkspace agentTasks={[digestOnlyTask]} items={crowdedItems} settings={{}} sources={sources} />);

  expect(screen.getByRole("link", { name: "查看引用 1" })).toHaveAttribute("href", "#article-digest-only");
  expect(screen.getByRole("region", { name: "简报来源" })).toHaveTextContent("Digest only reference");
  expect(screen.getByTestId("article-digest-only")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx
```

Expected result: fails because fallback referenced articles are not rendered.

- [ ] **Step 3: Render compact digest reference fallback**

Modify `components/rankings/category-board-workspace.tsx`.

After `renderedItemIds`, add:

```tsx
const fallbackReferenceItems = referenceItems.filter((item) => !renderedItemIds.has(item.id));
```

Replace `citationHrefs` with:

```tsx
const citationHrefs = new Map(
  referenceItems.map((item, index) => [index + 1, `#${categoryArticleDomId(item)}`] as [number, string])
);
```

Inside `<section aria-label="简报工具"...>`, render the fallback immediately after `DigestCard`:

```tsx
<div className="grid gap-3">
  <DigestCard citationHrefs={citationHrefs} latestDigest={latestDigest} mode={digestMode} referenceItems={referenceItems} />
  {fallbackReferenceItems.length > 0 ? (
    <section aria-label="简报来源" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">References</p>
        <h2 className="mt-1 text-base font-semibold tracking-normal text-slate-950">简报来源</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {fallbackReferenceItems.map((item) => {
          const source = sources.find((candidate) => candidate.id === item.sourceId);
          if (!source) return null;
          return (
            <article className="py-3" data-testid={categoryArticleDomId(item)} id={categoryArticleDomId(item)} key={item.id}>
              <a className="text-sm font-semibold text-slate-950 underline-offset-2 hover:underline" href={item.url} rel="noreferrer" target="_blank">
                {item.title}
              </a>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{source.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
            </article>
          );
        })}
      </div>
    </section>
  ) : null}
</div>
```

Then keep the existing right-side `<div className="grid content-start gap-3">` for `DigestActionPanel` and `ModelSettingsForm`.

Do not use the heading text `引用文章`; existing tests assert that old heading is absent.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/category-board-workspace.test.tsx tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 5: Commit**

```powershell
git add components/rankings/category-board-workspace.tsx tests/category-board-workspace.test.tsx tests/digest-workspace.test.tsx
git commit -m "feat: keep digest references linked"
```

## Task 5: Show Persistent Recent Refresh Status

**Files:**
- Modify: `components/digest/source-refresh-panel.tsx`
- Modify: `components/rankings/category-board-workspace.tsx`
- Modify: `components/app-shell/narro-workspace.tsx`
- Modify: `app/page.tsx`
- Modify: `tests/source-refresh-panel.test.tsx`
- Modify: `tests/category-board-workspace.test.tsx`
- Modify: `tests/home-workspace.test.tsx`

- [ ] **Step 1: Write failing source refresh panel status test**

In `tests/source-refresh-panel.test.tsx`, update imports:

```tsx
import { SourceRefreshPanel, SourceRefreshStatus } from "@/components/digest/source-refresh-panel";
```

Add:

```tsx
test("shows recent persisted refresh status", () => {
  render(
    <SourceRefreshPanel
      recentRefreshLogs={[
        {
          id: "refresh-1",
          sourceId: "hacker-news-rss",
          sourceName: "Hacker News RSS",
          ok: true,
          fetchedCount: 8,
          insertedCount: 2,
          latencyMs: 120,
          error: "",
          createdAt: "2026-05-28T02:00:00.000Z"
        },
        {
          id: "refresh-2",
          sourceId: "react-blog",
          sourceName: "React Blog",
          ok: false,
          fetchedCount: 0,
          insertedCount: 0,
          latencyMs: 90,
          error: "HTTP 503",
          createdAt: "2026-05-28T02:01:00.000Z"
        }
      ]}
    />
  );

  expect(screen.getByText("最近刷新")).toBeInTheDocument();
  expect(screen.getByText("成功 1 个 / 失败 1 个")).toBeInTheDocument();
  expect(screen.getByText("失败源：React Blog")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing workspace/homepage pass-through tests**

In `tests/category-board-workspace.test.tsx`, add:

```tsx
test("passes recent refresh status into the refresh panel", () => {
  render(
    <CategoryBoardWorkspace
      agentTasks={[]}
      items={items}
      refreshLogs={[
        {
          id: "refresh-1",
          sourceId: "react-blog",
          sourceName: "React Blog",
          ok: false,
          fetchedCount: 0,
          insertedCount: 0,
          latencyMs: 90,
          error: "HTTP 503",
          createdAt: "2026-05-28T02:01:00.000Z"
        }
      ]}
      settings={{}}
      sources={sources}
    />
  );

  expect(screen.getByText("最近刷新")).toBeInTheDocument();
  expect(screen.getByText("失败源：React Blog")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
pnpm test tests/source-refresh-panel.test.tsx tests/category-board-workspace.test.tsx
```

Expected result: fails because refresh logs are not accepted or rendered.

- [ ] **Step 4: Add refresh log props through app and workspace**

Modify `components/app-shell/narro-workspace.tsx`.

Import `RefreshLog`:

```tsx
import type {
  AgentTask,
  Item,
  RefreshLog,
  Source,
  WorkspaceSummary
} from "@/lib/domain";
```

Add prop:

```tsx
refreshLogs: RefreshLog[];
```

Destructure `refreshLogs`, then pass it:

```tsx
<CategoryBoardWorkspace
  agentTasks={agentTasks}
  items={items}
  refreshLogs={refreshLogs}
  searchQuery={searchQuery}
  settings={settings}
  sources={sources}
/>
```

Modify `app/page.tsx`:

```tsx
refreshLogs={workspace.refreshLogs}
```

Modify `components/rankings/category-board-workspace.tsx` to import `RefreshLog`, add `refreshLogs?: RefreshLog[]`, and pass:

```tsx
<SourceRefreshPanel recentRefreshLogs={refreshLogs ?? []} />
```

- [ ] **Step 5: Render persistent status in SourceRefreshPanel**

Modify `components/digest/source-refresh-panel.tsx`.

Import `RefreshLog`:

```tsx
import type { DigestActionState, RefreshLog } from "@/lib/domain";
```

Update props:

```tsx
interface SourceRefreshPanelProps {
  recentRefreshLogs?: RefreshLog[];
}

export function SourceRefreshPanel({ recentRefreshLogs = [] }: SourceRefreshPanelProps) {
```

After `<SourceRefreshStatus state={state} />`, add:

```tsx
<RecentRefreshSummary logs={recentRefreshLogs} />
```

Add:

```tsx
function RecentRefreshSummary({ logs }: { logs: RefreshLog[] }) {
  if (logs.length === 0) return null;

  const successCount = logs.filter((log) => log.ok).length;
  const failedLogs = logs.filter((log) => !log.ok);
  const latest = logs[0];

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">最近刷新</span>
        <span>成功 {successCount} 个 / 失败 {failedLogs.length} 个</span>
        <span className="text-slate-500">{formatRefreshTime(latest.createdAt)}</span>
      </div>
      {failedLogs.length > 0 ? (
        <p className="mt-1 text-amber-700">
          失败源：{failedLogs.map((log) => log.sourceName).join("、")}
        </p>
      ) : null}
    </div>
  );
}

function formatRefreshTime(iso: string) {
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

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
pnpm test tests/source-refresh-panel.test.tsx tests/category-board-workspace.test.tsx tests/home-workspace.test.tsx
pnpm typecheck
```

Expected result: all commands pass.

- [ ] **Step 7: Commit**

```powershell
git add app/page.tsx components/app-shell/narro-workspace.tsx components/rankings/category-board-workspace.tsx components/digest/source-refresh-panel.tsx tests/source-refresh-panel.test.tsx tests/category-board-workspace.test.tsx tests/home-workspace.test.tsx
git commit -m "feat: show recent ranking refresh status"
```

## Task 6: Documentation And Handoff Update

**Files:**
- Modify: `README.md`
- Modify: `docs/goal-handoff.md`

- [ ] **Step 1: Update README next steps**

In `README.md`, replace the `当前下一步` bullet list with:

```md
下一阶段只补基础功能产品能力：

- 观察真实使用后的分类命中质量，继续微调轻量规则。
- 打磨摘要质量和本地 fallback 简报表达。
- 改善隐藏后的撤销体验，但不恢复旧的信息流工作台。
- 明确模型连接测试和 AI 设置的保存反馈。
```

Keep the out-of-scope paragraph that excludes deployment, database migrations, Source Directory, Lens editor, event group UI, semantic search, and chat.

- [ ] **Step 2: Update goal handoff to point to this plan while active**

In `docs/goal-handoff.md`, update the recommended goal block:

```text
请进入 goal 模式，目标是按照 docs/superpowers/plans/2026-05-29-basic-ranking-board-followup.md 完成 Narro 大分类科技热榜基础功能补齐。

重要约束：
- 不要重新 brainstorming。
- 不要重新改产品方向。
- 按文档任务顺序执行。
- 使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务提交一次。
- 不要恢复旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build。
```

- [ ] **Step 3: Verify stale feature wording**

Run:

```powershell
rg -n 'Source Directory|Lens 编辑器|Agent 侧栏|事件组|OPML|高级筛选|语义搜索|聊天问答' README.md docs/goal-handoff.md
```

Expected result: matches are acceptable only in explicit out-of-scope statements.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/goal-handoff.md
git commit -m "docs: update ranking board follow-up handoff"
```

## Task 7: Full Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Run focused test set**

Run:

```powershell
pnpm test tests/category-source-pack.test.ts tests/category-board.test.ts tests/category-ranking-card.test.tsx tests/category-board-workspace.test.tsx tests/source-refresh-panel.test.tsx tests/digest-action.test.ts tests/digest-action-panel.test.tsx tests/digest-workspace.test.tsx tests/home-workspace.test.tsx
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

Expected result: no matches in `app`, `components/app-shell`, `components/digest`, or `components/rankings` that indicate mounted homepage UI.

- [ ] **Step 4: Inspect final state**

Run:

```powershell
git status --short --branch
git log --oneline -10
```

Expected result:

- Worktree is clean except intentional local-only files such as `.superpowers/`.
- Recent commits show refresh source alignment, search UX, read actions, citation anchors, refresh status, docs, and prior category board work.

## Execution Handoff Prompt

Use this prompt in a new conversation to execute this plan:

```text
请在 D:\Study\project\agent\narro 继续。

请直接执行实现文档：
docs/superpowers/plans/2026-05-29-basic-ranking-board-followup.md

重要约束：
- 不要重新 brainstorming。
- 不要重新改产品方向。
- 按计划任务顺序执行。
- 使用 TDD：先写失败测试，再实现，再验证。
- 每完成一个任务提交一次。
- 不要恢复旧的 Source/Lens 侧栏、Agent 侧栏、事件组、OPML、高级筛选。
- 不要做 Source Directory、Lens 编辑器、语义搜索、聊天问答、部署、多用户、数据库迁移。
- 保持当前首页主路径：获取最新信息 -> 五分类科技热榜 -> 打开原文/已读/隐藏 -> 可选生成简报。
- 最后运行 pnpm lint、pnpm typecheck、pnpm test、pnpm build。
```

## Acceptance Criteria

The implementation is complete when all of these are true:

- `获取最新信息` refreshes a ranking-board source pack that covers all five categories.
- Digest article selection remains available and does not become the homepage's primary product path.
- Search mode visibly shows the active query and a clear-search link.
- Search with no matches has a search-specific empty state.
- Read articles have a visible read state in ranking rows.
- The visible ranked board can be marked read in one action.
- Hide actions remain available for every ranking row.
- Digest citations always link to a visible DOM anchor, even when the cited item is outside a category top 10.
- Any citation fallback area is compact and named `简报来源`, not `引用文章`.
- The refresh panel shows persistent recent refresh status from repository refresh logs.
- Existing refresh action details still show per-source fetched/inserted/error information after a user-triggered refresh.
- Old Source/Lens/Agent/Event/OPML/advanced-filter UI is not mounted on the homepage.
- No database schema changes are introduced.
- No TopHub scraping or third-party page parsing is introduced.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## Plan Self-Review

- Spec coverage: Tasks cover the five identified basic gaps: refresh-source alignment, search state, read actions, stable digest citations, and persistent refresh status. Docs and full verification are included.
- Scope check: The plan stays within the current category ranking homepage. It does not add source management UI, Lens editing, Agent sidebars, event groups, OPML, semantic search, chat, deployment, or database migrations.
- Type consistency: The plan uses existing domain types `Item`, `Source`, `RefreshLog`, `AgentTask`, existing actions `markVisibleItemsReadAction`, `refreshTechSourcesAction`, and existing helper `categoryArticleDomId`.
- Test coverage: Unit tests cover source pack coverage. Component/integration tests cover search state, read rendering, batch read form, fallback citation anchors, persistent refresh summary, and homepage pass-through.
