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
