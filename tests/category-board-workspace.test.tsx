import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CategoryBoardWorkspace } from "@/components/rankings/category-board-workspace";
import type { AgentTask, Item, Source } from "@/lib/domain";

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
    summary: "Fixture summary for the ranking board row.",
    aiSummary: "",
    language: "en",
    tags: [],
    entities: [],
    importanceScore: 80,
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

const items = [
  item({ id: "ai-1", sourceId: "hugging-face-blog", title: "New model release", tags: ["ai"], importanceScore: 92 }),
  item({ id: "community-1", sourceId: "hacker-news-rss", title: "Show HN: developer tool", importanceScore: 91 }),
  item({ id: "engineering-1", sourceId: "react-blog", title: "React compiler runtime update", tags: ["framework"], importanceScore: 88 }),
  item({ id: "platform-1", sourceId: "github-changelog", title: "GitHub API changelog", tags: ["changelog"], importanceScore: 87 }),
  item({ id: "zh-1", sourceId: "infoq-cn", title: "中文架构实践", language: "zh", tags: ["zh"], importanceScore: 86 })
];

const digestTask: AgentTask = {
  id: "digest-1",
  type: "daily_brief",
  title: "生成今日简报",
  description: "基于当前 Lens 生成可回链的本地简报。",
  lensId: "ai-coding",
  status: "completed",
  input: JSON.stringify({
    kind: "tech_digest",
    label: "今日科技简报",
    mode: "local",
    referenceItemIds: ["ai-1"]
  }),
  output: "## 今日重点\n- [1] New model release 值得关注。",
  createdAt: "2026-05-28T02:00:00.000Z",
  updatedAt: "2026-05-28T02:00:00.000Z",
  primary: true
};

describe("category board workspace", () => {
  test("renders the technology ranking board and five category cards", () => {
    render(<CategoryBoardWorkspace agentTasks={[digestTask]} items={items} settings={{}} sources={sources} />);

    const main = screen.getByRole("main", { name: "科技热榜" });
    expect(within(main).getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "科技热榜" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "AI / 模型" })).toHaveAttribute("href", "#ai-models");
    expect(within(main).getByRole("link", { name: "开发者社区" })).toHaveAttribute("href", "#developer-community");
    expect(within(main).getByRole("link", { name: "工程 / 开源" })).toHaveAttribute("href", "#engineering-open-source");
    expect(within(main).getByRole("link", { name: "产品 / 平台" })).toHaveAttribute("href", "#product-platform");
    expect(within(main).getByRole("link", { name: "中文技术" })).toHaveAttribute("href", "#chinese-tech");
    expect(within(main).getByRole("region", { name: "AI / 模型" })).toHaveTextContent("New model release");
    expect(within(main).getByRole("region", { name: "开发者社区" })).toHaveTextContent("Show HN: developer tool");
    expect(within(main).getByRole("region", { name: "工程 / 开源" })).toHaveTextContent("React compiler runtime update");
    expect(within(main).getByRole("region", { name: "产品 / 平台" })).toHaveTextContent("GitHub API changelog");
    expect(within(main).getByRole("region", { name: "中文技术" })).toHaveTextContent("中文架构实践");
  });

  test("keeps digest tools after the ranking board", () => {
    render(<CategoryBoardWorkspace agentTasks={[digestTask]} items={items} settings={{}} sources={sources} />);

    const rankingHeading = screen.getByRole("heading", { name: "科技热榜" });
    const digestHeading = screen.getByRole("heading", { name: "今日科技简报" });
    const position = rankingHeading.compareDocumentPosition(digestHeading);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
    expect(screen.getByText("AI 设置")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看引用 1" })).toHaveAttribute("href", "#article-ai-1");
  });

  test("shows refresh controls before category rankings", () => {
    render(<CategoryBoardWorkspace agentTasks={[]} items={items} settings={{}} sources={sources} />);

    const refreshButton = screen.getByRole("button", { name: "获取最新信息" });
    const rankingHeading = screen.getByRole("heading", { name: "科技热榜" });
    const position = refreshButton.compareDocumentPosition(rankingHeading);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("renders all category cards with empty states when no articles exist", () => {
    render(<CategoryBoardWorkspace agentTasks={[]} items={[]} settings={{}} sources={sources} />);

    expect(screen.getAllByText("暂无内容。点击获取最新信息后，这里会显示该分类的热榜。")).toHaveLength(5);
    expect(screen.getByText("还没有生成简报。")).toBeInTheDocument();
  });

  test("shows search context and a clear link when filtering rankings", () => {
    render(<CategoryBoardWorkspace agentTasks={[]} items={items} searchQuery="compiler" settings={{}} sources={sources} />);

    const main = screen.getByRole("main", { name: "科技热榜" });
    expect(within(main).getByText("搜索：compiler")).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "清除搜索" })).toHaveAttribute("href", "/");
  });

  test("uses a search-specific empty state when filtered rankings have no results", () => {
    render(<CategoryBoardWorkspace agentTasks={[]} items={[]} searchQuery="definitely-no-hit" settings={{}} sources={sources} />);

    expect(screen.getAllByText("当前搜索没有匹配文章。请调整关键词或清除搜索。")).toHaveLength(5);
    expect(screen.queryByText("暂无内容。点击获取最新信息后，这里会显示该分类的热榜。")).not.toBeInTheDocument();
  });
});
