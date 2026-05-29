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
    expect(within(card).getAllByText("已读").length).toBeGreaterThanOrEqual(1);
    expect(within(card).getByTestId("article-hn-1")).toHaveAttribute("data-read-status", "read");
  });
});
