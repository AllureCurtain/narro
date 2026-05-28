import { describe, expect, test, vi } from "vitest";
import type { Item, Source } from "@/lib/domain";
import { buildDigestPrompt, generateDigestFromItems } from "@/lib/digest/generator";
import { selectDigestEntries, techDigestSourceIds } from "@/lib/digest/source-pack";

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
    expect(result.output).toContain("## AI 与开发工具");
    expect(result.output).toContain("[1] Show HN: Fast AI coding workspace");
    expect(result.references).toEqual([{ index: 1, itemId: "hn-1" }]);
  });

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
