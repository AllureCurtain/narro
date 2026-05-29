import { existsSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { insertItemIfNew, prepareDatabase, saveSetting } from "@/lib/db/repositories";
import { describe, expect, test } from "vitest";

const root = process.cwd();

describe("Narro digest workspace", () => {
  test("renders the source-first product path", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
    const { default: Home } = await import("@/app/page");
    const pagePath = path.join(root, "app", "page.tsx");
    const domainPath = path.join(root, "lib", "domain.ts");

    expect(existsSync(pagePath), "app/page.tsx should exist").toBe(true);
    expect(existsSync(domainPath), "lib/domain.ts should exist").toBe(true);

    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("banner")).toHaveTextContent("Narro");
    expect(screen.getByRole("searchbox")).toHaveAccessibleName("搜索已抓取的文章");
    expect(screen.getByRole("main", { name: "科技热榜" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "获取最新信息" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成今日科技简报" })).toBeInTheDocument();
    expect(screen.getByText("AI 设置")).toBeInTheDocument();
    expect(screen.queryByText("模型设置")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "科技热榜" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI / 模型" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "开发者社区" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "工程 / 开源" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "产品 / 平台" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "中文技术" })).toBeInTheDocument();
    expect(screen.queryByText("最新文章")).not.toBeInTheDocument();
    expect(screen.queryByText("引用文章")).not.toBeInTheDocument();

    expect(screen.queryByRole("navigation", { name: "信息源和视角" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Agent 任务" })).not.toBeInTheDocument();
    expect(screen.queryByText("高级筛选")).not.toBeInTheDocument();
    expect(screen.queryByText("事件组与趋势")).not.toBeInTheDocument();
    expect(screen.queryByText("OPML")).not.toBeInTheDocument();
    expect(screen.queryByText("M1 先接这些")).not.toBeInTheDocument();

    await closeDatabase();
  }, 60000);

  test("shows persisted model settings and referenced digest articles", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();

    const database = getDatabase();
    await prepareDatabase(database);
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://api.example.com/v1");
    await saveSetting(database, "llm.model", "gpt-5-mini");
    await saveSetting(database, "llm.apiKey", "test-key");
    await insertItemIfNew(
      database,
      {
        id: "test-hn-api-item",
        sourceId: "hacker-news-rss",
        title: "Show HN: Fast local AI coding workspace",
        url: "https://example.com/fast-local-ai-coding",
        author: "hn-user",
        publishedAt: "2026-05-22T08:30:00.000Z",
        fetchedAt: "2026-05-22T09:00:00.000Z",
        summary: "A local AI coding workspace with fast feedback loops.",
        aiSummary: "",
        language: "en",
        tags: ["api", "community", "developer"],
        entities: ["Hacker News"],
        importanceScore: 91,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "HN score 480 with 74 comments",
        actionLabels: ["打开原文"]
      },
      "hn-api-1001"
    );

    const { default: Home } = await import("@/app/page");
    render(await Home({ searchParams: Promise.resolve({}) }));

    const main = screen.getByRole("main", { name: "科技热榜" });
    const aiSettings = within(main).getByText("AI 设置");
    expect(aiSettings).toBeInTheDocument();
    expect(within(main).queryByDisplayValue("https://api.example.com/v1")).not.toBeInTheDocument();
    expect(within(main).getByRole("link", { name: /Show HN: Fast local AI coding workspace/ })).toHaveAttribute(
      "href",
      "https://example.com/fast-local-ai-coding"
    );

    await closeDatabase();
  }, 60000);
});
