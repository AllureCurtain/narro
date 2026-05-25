import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { NarroDatabase } from "@/lib/db/client";
import { closeDatabase, createDatabase, initializeDatabase, resetDatabase } from "@/lib/db/client";
import {
  createSource,
  createLens,
  exportSourcesToOpml,
  getWorkspaceData,
  importSourcesFromOpml,
  listAgentTasks,
  listItems,
  listRefreshLogs,
  listSettings,
  listSources,
  saveSetting,
  runAgentTask,
  seedDatabase,
  exportWorkspaceBackup,
  markItemsReadStatus,
  testLlmConnection,
  updateSourceEnabled,
  updateItemState
} from "@/lib/db/repositories";
import { refreshDueSources, refreshEnabledSources, refreshSource } from "@/lib/ingestion/refresh";

const rssSample = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>GitHub Changelog</title>
    <item>
      <title>GitHub adds repository governance controls</title>
      <link>https://github.blog/changelog/repository-governance</link>
      <guid>github-governance-1</guid>
      <pubDate>Fri, 22 May 2026 08:30:00 GMT</pubDate>
      <dc:creator>GitHub</dc:creator>
      <description>Repository rules now support more controls for enterprise teams.</description>
    </item>
  </channel>
</rss>`;

describe("database-backed ingestion MVP", () => {
  let database: NarroDatabase;

  beforeEach(async () => {
    database = createDatabase("file::memory:");
    await initializeDatabase(database);
    await seedDatabase(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await closeDatabase(database);
  });

  test("seeds verified free sources and default lenses", async () => {
    const sources = await listSources(database);
    const workspace = await getWorkspaceData(database, { lensId: "ai-coding" });

    expect(sources.length).toBeGreaterThan(20);
    expect(sources.map((source) => source.id)).toEqual(expect.arrayContaining(["github-changelog", "hacker-news-rss"]));
    expect(sources.find((source) => source.id === "hacker-news-rss")?.enabled).toBe(true);
    expect(sources.find((source) => source.id === "github-changelog")?.enabled).toBe(false);
    expect(sources.find((source) => source.id === "github-release-nextjs")?.enabled).toBe(false);
    expect(sources.every((source) => source.type !== "webpage")).toBe(true);
    expect(workspace.lenses.map((lens) => lens.id)).toEqual(
      expect.arrayContaining(["ai-coding", "tech-trends", "research-watch"])
    );
  });

  test("refreshes a source into items and dedupes repeated refreshes", async () => {
    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));

    const first = await refreshSource(database, "github-changelog", { fetcher });
    const second = await refreshSource(database, "github-changelog", { fetcher });
    const defaultItems = await listItems(database, { lensId: "ai-coding" });
    const sourceItems = await listItems(database, { lensId: "ai-coding", sourceId: "github-changelog" });

    expect(first.insertedCount).toBe(1);
    expect(second.insertedCount).toBe(0);
    expect(defaultItems).toHaveLength(0);
    expect(sourceItems).toHaveLength(1);
    expect(sourceItems[0]).toMatchObject({
      sourceId: "github-changelog",
      title: "GitHub adds repository governance controls",
      readStatus: "unread"
    });
  });

  test("creates custom lenses and filters stored items by keywords", async () => {
    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));
    await refreshSource(database, "github-changelog", { fetcher });

    await createLens(database, {
      id: "governance",
      name: "治理",
      description: "只看企业治理和仓库规则",
      sourceGroupFilters: ["产品更新"],
      keywordFilters: ["governance", "repository"],
      entityFilters: ["GitHub"],
      tagFilters: [],
      rankingMode: "latest"
    });

    const workspace = await getWorkspaceData(database, { lensId: "governance", sourceId: "github-changelog" });

    expect(workspace.activeLens.id).toBe("governance");
    expect(workspace.items).toHaveLength(1);
    expect(workspace.summary.digestBody).toContain("1 条");
  });

  test("filters workspace items by selected source", async () => {
    const githubFeed = rssSample.replace(
      "https://github.blog/changelog/repository-governance",
      "https://github.blog/changelog/github-ai-repository-governance"
    );
    const vercelFeed = rssSample
      .replace("GitHub adds repository governance controls", "Vercel ships AI repository release controls")
      .replace("github-governance-1", "vercel-release-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://vercel.com/changelog/ai-repository-release-controls"
      );

    await refreshSource(database, "github-changelog", {
      fetcher: vi.fn(async () => new Response(githubFeed, { status: 200 }))
    });
    await refreshSource(database, "vercel-changelog", {
      fetcher: vi.fn(async () => new Response(vercelFeed, { status: 200 }))
    });

    const workspace = await getWorkspaceData(database, {
      lensId: "ai-coding",
      sourceId: "github-changelog"
    } as Parameters<typeof getWorkspaceData>[1] & { sourceId: string });

    expect(workspace.items).toHaveLength(1);
    expect(workspace.items[0].sourceId).toBe("github-changelog");
  });

  test("hides disabled GitHub sources from the default workspace feed", async () => {
    const githubFeed = rssSample.replace(
      "https://github.blog/changelog/repository-governance",
      "https://github.blog/changelog/github-ai-repository-governance"
    );
    const hackerNewsFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: A useful AI research browser")
      .replace("github-governance-1", "hn-show-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://news.ycombinator.com/item?id=123"
      );

    await refreshSource(database, "github-changelog", {
      fetcher: vi.fn(async () => new Response(githubFeed, { status: 200 }))
    });
    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hackerNewsFeed, { status: 200 }))
    });

    const workspace = await getWorkspaceData(database, { lensId: "ai-coding" });

    expect(workspace.items.map((item) => item.sourceId)).toEqual(["hacker-news-rss"]);
  });

  test("updates item saved, hidden, and reading state for feed views", async () => {
    const hackerNewsFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: A useful AI research browser")
      .replace("github-governance-1", "hn-show-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://news.ycombinator.com/item?id=123"
      );

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hackerNewsFeed, { status: 200 }))
    });

    const [item] = await listItems(database, { lensId: "ai-coding" });
    await updateItemState(database, item.id, { saved: true, readStatus: "reading" });

    const savedItems = await listItems(database, { lensId: "ai-coding", view: "saved" });
    const readingItems = await listItems(database, { lensId: "ai-coding", view: "reading" });

    expect(savedItems.map((savedItem) => savedItem.id)).toEqual([item.id]);
    expect(readingItems.map((readingItem) => readingItem.id)).toEqual([item.id]);
    expect(readingItems[0]).toMatchObject({ saved: true, readStatus: "reading" });

    await updateItemState(database, item.id, { hidden: true });

    expect(await listItems(database, { lensId: "ai-coding" })).toHaveLength(0);
    expect(await listItems(database, { lensId: "ai-coding", view: "hidden" })).toHaveLength(1);
  });

  test("filters stored items by entity, tag, importance, and published time", async () => {
    const strongHnFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: OpenAI agent browser reaches developers")
      .replace("github-governance-1", "hn-filter-strong")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://news.ycombinator.com/item?id=222"
      );
    const weakBlogFeed = rssSample
      .replace("GitHub adds repository governance controls", "Small CSS release note")
      .replace("github-governance-1", "css-filter-weak")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://example.com/small-css-release"
      )
      .replace("Fri, 22 May 2026 08:30:00 GMT", "Wed, 20 May 2026 08:30:00 GMT");

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(strongHnFeed, { status: 200 }))
    });
    await refreshSource(database, "tailwind-css-blog", {
      fetcher: vi.fn(async () => new Response(weakBlogFeed, { status: 200 }))
    });

    const items = await listItems(database, {
      entity: "OpenAI",
      lensId: "ai-coding",
      minImportance: 55,
      since: "2026-05-21T00:00:00.000Z",
      tag: "community"
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceId: "hacker-news-rss",
      title: "Show HN: OpenAI agent browser reaches developers"
    });
  });

  test("marks a batch of visible items read without touching hidden items", async () => {
    const firstFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: Batch read AI item")
      .replace("github-governance-1", "batch-read-1")
      .replace("https://github.blog/changelog/repository-governance", "https://news.ycombinator.com/item?id=333");
    const secondFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: Hidden batch read AI item")
      .replace("github-governance-1", "batch-read-2")
      .replace("https://github.blog/changelog/repository-governance", "https://news.ycombinator.com/item?id=444");

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(firstFeed, { status: 200 }))
    });
    await refreshSource(database, "lobsters-rss", {
      fetcher: vi.fn(async () => new Response(secondFeed, { status: 200 }))
    });

    const allItems = await listItems(database, { lensId: "ai-coding" });
    await updateItemState(database, allItems[0].id, { hidden: true });
    const visibleItems = await listItems(database, { lensId: "ai-coding" });

    await markItemsReadStatus(database, visibleItems.map((item) => item.id), "read");

    const hiddenItems = await listItems(database, { lensId: "ai-coding", view: "hidden" });
    const readItems = await listItems(database, { lensId: "ai-coding", view: "all" });

    expect(readItems.every((item) => item.readStatus === "read")).toBe(true);
    expect(hiddenItems[0].readStatus).toBe("unread");
  });

  test("manages source enablement and custom RSS sources without resetting user choices", async () => {
    await updateSourceEnabled(database, "hacker-news-rss", false);
    await seedDatabase(database);

    const disabledSources = await listSources(database);
    expect(disabledSources.find((source) => source.id === "hacker-news-rss")?.enabled).toBe(false);

    await createSource(database, {
      id: "custom-ai-feed",
      name: "Custom AI Feed",
      type: "rss",
      url: "https://example.com/ai.xml",
      group: "自定义",
      enabled: true,
      refreshIntervalMinutes: 45,
      tags: ["ai", "custom"],
      entities: ["Custom AI"]
    });

    const customFeed = rssSample
      .replace("GitHub adds repository governance controls", "Custom AI agents change release workflows")
      .replace("github-governance-1", "custom-ai-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://example.com/posts/custom-ai-agents"
      );

    const result = await refreshSource(database, "custom-ai-feed", {
      fetcher: vi.fn(async () => new Response(customFeed, { status: 200 }))
    });
    const items = await listItems(database, { lensId: "ai-coding", sourceId: "custom-ai-feed" });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceId: "custom-ai-feed",
      title: "Custom AI agents change release workflows"
    });
  });

  test("refreshes Hacker News API stories with score-based ranking", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/topstories.json")) {
        return new Response(JSON.stringify([1001, 1002]), { status: 200 });
      }

      if (url.endsWith("/item/1001.json")) {
        return new Response(
          JSON.stringify({
            by: "hn-user",
            descendants: 74,
            id: 1001,
            score: 480,
            time: 1779516000,
            title: "Show HN: Fast local AI coding workspace",
            type: "story",
            url: "https://example.com/fast-local-ai-coding"
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          by: "another-user",
          descendants: 3,
          id: 1002,
          score: 18,
          time: 1779512400,
          title: "Small release note for a CLI",
          type: "story",
          url: "https://example.com/small-cli-release"
        }),
        { status: 200 }
      );
    });

    const result = await refreshSource(database, "hn-api-top-stories", { fetcher, limit: 2 });
    const items = await listItems(database, { lensId: "ai-coding", sourceId: "hn-api-top-stories" });

    expect(result.ok).toBe(true);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Show HN: Fast local AI coding workspace");
    expect(items[0].importanceScore).toBeGreaterThan(items[1].importanceScore);
  });

  test("runs local agent tasks and persists completed outputs", async () => {
    const hackerNewsFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: A useful AI research browser")
      .replace("github-governance-1", "hn-agent-brief-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://news.ycombinator.com/item?id=456"
      );

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hackerNewsFeed, { status: 200 }))
    });

    const [item] = await listItems(database, { lensId: "ai-coding" });
    const brief = await runAgentTask(database, { type: "daily_brief", lensId: "ai-coding" });
    const explanation = await runAgentTask(database, { type: "explain_item", lensId: "ai-coding", itemId: item.id });
    const tasks = await listAgentTasks(database, { lensId: "ai-coding" });

    expect(brief.status).toBe("completed");
    expect(brief.output).toContain("Show HN: A useful AI research browser");
    expect(explanation.status).toBe("completed");
    expect(explanation.output).toContain(item.title);
    expect(tasks.map((task) => task.status)).toContain("completed");
    expect(tasks.some((task) => task.output?.includes("Show HN"))).toBe(true);
  });

  test("runs configured OpenAI-compatible LLM tasks and persists model output", async () => {
    const hackerNewsFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: A useful AI research browser")
      .replace("github-governance-1", "hn-agent-llm-1")
      .replace(
        "https://github.blog/changelog/repository-governance",
        "https://news.ycombinator.com/item?id=789"
      );

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hackerNewsFeed, { status: 200 }))
    });
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://llm.example.com/v1");
    await saveSetting(database, "llm.model", "narro-test-model");

    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://llm.example.com/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        authorization: "Bearer test-key"
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: "narro-test-model"
      });

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "模型简报：HN 正在讨论一个有用的 AI research browser。" } }]
        }),
        { status: 200 }
      );
    });

    const task = await runAgentTask(
      database,
      { type: "daily_brief", lensId: "ai-coding" },
      { apiKey: "test-key", fetcher }
    );

    expect(fetcher).toHaveBeenCalledOnce();
    expect(task.status).toBe("completed");
    expect(task.output).toBe("模型简报：HN 正在讨论一个有用的 AI research browser。");
  });

  test("persists a failed agent task when configured LLM calls fail", async () => {
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://llm.example.com/v1");
    await saveSetting(database, "llm.model", "narro-test-model");

    const task = await runAgentTask(
      database,
      { type: "daily_brief", lensId: "ai-coding" },
      {
        apiKey: "test-key",
        fetcher: vi.fn(async () => new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 }))
      }
    );

    expect(task.status).toBe("failed");
    expect(task.error).toContain("rate limited");
  });

  test("tests LLM connectivity and stores the latest connection status", async () => {
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://llm.example.com/v1");
    await saveSetting(database, "llm.model", "narro-test-model");

    const success = await testLlmConnection(database, {
      apiKey: "test-key",
      fetcher: vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })
      )
    });
    const settingsAfterSuccess = await listSettings(database);

    expect(success).toMatchObject({ ok: true, status: "healthy" });
    expect(settingsAfterSuccess["llm.lastCheckStatus"]).toBe("healthy");
    expect(settingsAfterSuccess["llm.lastCheckMessage"]).toContain("narro-test-model");

    const failure = await testLlmConnection(database, {
      apiKey: "test-key",
      fetcher: vi.fn(async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }))
    });
    const settingsAfterFailure = await listSettings(database);

    expect(failure).toMatchObject({ ok: false, status: "failing" });
    expect(settingsAfterFailure["llm.lastCheckStatus"]).toBe("failing");
    expect(settingsAfterFailure["llm.lastCheckMessage"]).toContain("bad key");
  });

  test("refreshes enabled sources with bounded concurrency instead of serial order", async () => {
    const started: string[] = [];
    const gates: Array<() => void> = [];
    let callIndex = 0;

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const currentCall = ++callIndex;
      started.push(String(input));

      await new Promise<void>((resolve) => gates.push(resolve));

      return new Response(
        rssSample
          .replace("GitHub adds repository governance controls", `AI repository release ${currentCall}`)
          .replace("github-governance-1", `governance-${currentCall}`)
          .replace(
            "https://github.blog/changelog/repository-governance",
            `https://github.blog/changelog/repository-governance-${currentCall}`
          ),
        { status: 200 }
      );
    });

    const refreshPromise = refreshEnabledSources(database, { concurrency: 2, fetcher, limit: 3 });

    await waitUntil(() => started.length === 2);
    expect(started).toHaveLength(2);

    gates.shift()?.();
    await waitUntil(() => started.length === 3);

    for (const release of gates.splice(0)) {
      release();
    }

    const results = await refreshPromise;

    expect(results).toHaveLength(3);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  test("refreshes only sources whose scheduled refresh is due", async () => {
    const fetchedAt = "2026-05-24T12:00:00.000Z";
    await createSource(database, {
      id: "fresh-source",
      name: "Fresh Source",
      type: "rss",
      url: "https://example.com/fresh.xml",
      group: "自定义",
      enabled: true,
      refreshIntervalMinutes: 120,
      tags: ["ai"],
      entities: ["Fresh"]
    });
    await createSource(database, {
      id: "stale-source",
      name: "Stale Source",
      type: "rss",
      url: "https://example.com/stale.xml",
      group: "自定义",
      enabled: true,
      refreshIntervalMinutes: 30,
      tags: ["ai"],
      entities: ["Stale"]
    });
    await database.client.execute("update sources set enabled = 0 where id not in ('fresh-source', 'stale-source')");

    await refreshSource(database, "fresh-source", {
      fetcher: vi.fn(async () => new Response(rssSample, { status: 200 }))
    });
    await database.client.execute({
      sql: "update sources set last_fetched_at = ? where id = ?",
      args: [fetchedAt, "fresh-source"]
    });
    await database.client.execute({
      sql: "update sources set last_fetched_at = ? where id = ?",
      args: ["2026-05-24T10:00:00.000Z", "stale-source"]
    });

    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));
    const results = await refreshDueSources(database, {
      concurrency: 1,
      fetcher,
      limit: 10,
      now: new Date("2026-05-24T12:20:00.000Z")
    });

    expect(results.map((result) => result.sourceId)).toContain("stale-source");
    expect(results.map((result) => result.sourceId)).not.toContain("fresh-source");
  });

  test("records source health after refresh success and failure", async () => {
    const failingFetcher = vi.fn(async () => new Response("nope", { status: 503 }));
    const failed = await refreshSource(database, "hacker-news-rss", { fetcher: failingFetcher });
    const afterFailure = (await listSources(database)).find((source) => source.id === "hacker-news-rss");

    expect(failed.ok).toBe(false);
    expect(afterFailure).toMatchObject({
      failureCount: 1,
      healthStatus: "degraded",
      lastError: "HTTP 503"
    });

    const successful = await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(rssSample, { status: 200 }))
    });
    const afterSuccess = (await listSources(database)).find((source) => source.id === "hacker-news-rss");

    expect(successful.ok).toBe(true);
    expect(afterSuccess).toMatchObject({
      failureCount: 0,
      healthStatus: "healthy",
      lastError: ""
    });
    expect(afterSuccess?.averageLatencyMs).toBeGreaterThanOrEqual(0);
  });

  test("records refresh logs for successful and failed source refreshes", async () => {
    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(rssSample, { status: 200 }))
    });
    await refreshSource(database, "lobsters-rss", {
      fetcher: vi.fn(async () => new Response("service unavailable", { status: 503 }))
    });

    const logs = await listRefreshLogs(database, { limit: 5 });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      sourceId: "lobsters-rss",
      sourceName: "Lobsters RSS",
      ok: false,
      error: "HTTP 503"
    });
    expect(logs[1]).toMatchObject({
      sourceId: "hacker-news-rss",
      sourceName: "Hacker News RSS",
      ok: true,
      fetchedCount: 1,
      insertedCount: 1
    });
    expect(logs[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  test("clusters duplicate event stories across sources with representative items", async () => {
    const googleFeed = rssSample
      .replace("GitHub adds repository governance controls", "OpenAI launches agent runtime for developers")
      .replace("github-governance-1", "openai-runtime-google")
      .replace("https://github.blog/changelog/repository-governance", "https://example.com/openai-agent-runtime-google");
    const hfFeed = rssSample
      .replace("GitHub adds repository governance controls", "OpenAI agent runtime reaches Hacker News discussion")
      .replace("github-governance-1", "openai-runtime-hn")
      .replace("https://github.blog/changelog/repository-governance", "https://example.com/openai-agent-runtime-hn");

    await refreshSource(database, "google-ai-blog", {
      fetcher: vi.fn(async () => new Response(googleFeed, { status: 200 }))
    });
    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hfFeed, { status: 200 }))
    });

    const workspace = await getWorkspaceData(database, { lensId: "ai-coding" });

    expect(workspace.eventGroups).toHaveLength(1);
    expect(workspace.eventGroups[0].title).toContain("OpenAI");
    expect(workspace.eventGroups[0].sourceCount).toBe(2);
    expect(workspace.items.filter((item) => item.eventGroupId === workspace.eventGroups[0].id)).toHaveLength(2);
  });

  test("imports and exports OPML source lists", async () => {
    const imported = await importSourcesFromOpml(
      database,
      `<?xml version="1.0"?><opml version="2.0"><body><outline text="Custom AI" title="Custom AI" type="rss" xmlUrl="https://example.com/custom-ai.xml" htmlUrl="https://example.com"/></body></opml>`
    );
    const sources = await listSources(database);
    const exported = await exportSourcesToOpml(database);

    expect(imported).toEqual(["custom-ai"]);
    expect(sources.find((source) => source.id === "custom-ai")).toMatchObject({
      name: "Custom AI",
      url: "https://example.com/custom-ai.xml",
      enabled: true
    });
    expect(exported).toContain("Custom AI");
    expect(exported).toContain("https://example.com/custom-ai.xml");
  });

  test("exports a JSON workspace backup with sources, lenses, items, tasks, and settings", async () => {
    await saveSetting(database, "llm.model", "gpt-5-mini");
    const hackerNewsFeed = rssSample
      .replace("GitHub adds repository governance controls", "Show HN: Backup includes AI item")
      .replace("github-governance-1", "backup-item-1")
      .replace("https://github.blog/changelog/repository-governance", "https://news.ycombinator.com/item?id=555");

    await refreshSource(database, "hacker-news-rss", {
      fetcher: vi.fn(async () => new Response(hackerNewsFeed, { status: 200 }))
    });
    await runAgentTask(database, { type: "daily_brief", lensId: "ai-coding" });

    const backup = await exportWorkspaceBackup(database);

    expect(backup.version).toBe(1);
    expect(backup.sources.some((source) => source.id === "hacker-news-rss")).toBe(true);
    expect(backup.lenses.some((lens) => lens.id === "ai-coding")).toBe(true);
    expect(backup.items.some((item) => item.title.includes("Backup includes AI item"))).toBe(true);
    expect(backup.agentTasks.some((task) => task.type === "daily_brief")).toBe(true);
    expect(backup.settings["llm.model"]).toBe("gpt-5-mini");
  });

  test("persists local LLM settings separately from source data", async () => {
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://api.example.com/v1");
    await saveSetting(database, "llm.model", "gpt-5-mini");

    expect(await listSettings(database)).toMatchObject({
      "llm.provider": "openai-compatible",
      "llm.baseUrl": "https://api.example.com/v1",
      "llm.model": "gpt-5-mini"
    });
  });

  test("refreshes Hacker News and readable sources before product or release feeds", async () => {
    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));

    const results = await refreshEnabledSources(database, { concurrency: 1, fetcher, limit: 4 });

    expect(results.map((result) => result.sourceId)).toEqual([
      "hacker-news-rss",
      "lobsters-rss",
      "hugging-face-blog",
      "google-ai-blog"
    ]);
  });
});

async function waitUntil(condition: () => boolean) {
  const startedAt = Date.now();

  while (!condition()) {
    if (Date.now() - startedAt > 1000) {
      throw new Error("Timed out waiting for condition");
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
