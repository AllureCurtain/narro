import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { generateTechDigestForDatabase } from "@/app/actions";
import type { NarroDatabase } from "@/lib/db/client";
import { closeDatabase, createDatabase, initializeDatabase, resetDatabase } from "@/lib/db/client";
import { insertItemIfNew, listAgentTasks, prepareDatabase, saveSetting } from "@/lib/db/repositories";
import { parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import type { Item } from "@/lib/domain";

const rssDate = "2026-05-28T02:00:00.000Z";

const digestItem: Item = {
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
};

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
    await insertItemIfNew(database, digestItem, "digest-hn-1");

    const result = await generateTechDigestForDatabase(database, {
      refresh: false
    });
    const tasks = await listAgentTasks(database, { lensId: "ai-coding", limit: 10 });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("已生成");
    expect(result.digestOutput).toContain("Show HN: AI coding browser");
    expect(tasks.some((task) => task.type === "daily_brief" && task.output?.includes("Show HN"))).toBe(true);
    expect(parseDigestTaskReferenceIds(tasks[0].input)).toEqual(["digest-hn-1"]);
  });

  test("uses LLM settings including locally saved API key", async () => {
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://llm.example.com/v1");
    await saveSetting(database, "llm.model", "test-model");
    await saveSetting(database, "llm.apiKey", "test-key");
    await insertItemIfNew(
      database,
      {
        ...digestItem,
        id: "digest-hn-2",
        title: "OpenAI releases coding agent update",
        url: "https://news.ycombinator.com/item?id=101",
        entities: ["OpenAI"],
        importanceScore: 92
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

  test("reports refresh failures when no digest articles are available", async () => {
    const result = await generateTechDigestForDatabase(database, {
      fetcher: vi.fn(async () => new Response("service unavailable", { status: 503 }))
    });

    expect(result.ok).toBe(false);
    expect(result.failedCount).toBe(8);
    expect(result.message).toContain("8 个源刷新失败");
    expect(result.digestOutput).toContain("还没有可用于生成简报的信息");
  });
});
