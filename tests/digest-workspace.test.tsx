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
        settings={{
          "llm.provider": "openai-compatible",
          "llm.baseUrl": "https://api.example.com/v1",
          "llm.model": "test-model"
        }}
        sources={[source]}
        summary={summary}
      />
    );

    expect(screen.getByRole("main", { name: "今日科技简报" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
    expect(screen.getByText(/今日重点/)).toBeInTheDocument();
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
