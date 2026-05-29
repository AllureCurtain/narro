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
