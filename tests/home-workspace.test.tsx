import { existsSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { insertItemIfNew, markSourceRefreshFailure, prepareDatabase, recordRefreshLog, saveSetting } from "@/lib/db/repositories";
import { describe, expect, test } from "vitest";

const root = process.cwd();

describe("Narro M0 workspace", () => {
  test("renders the database-backed product workbench with feed, lenses, sources, and agent tasks", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
    const { default: Home } = await import("@/app/page");
    const pagePath = path.join(root, "app", "page.tsx");
    const dataPath = path.join(root, "lib", "mock-data.ts");
    const domainPath = path.join(root, "lib", "domain.ts");

    expect(existsSync(pagePath), "app/page.tsx should exist").toBe(true);
    expect(existsSync(dataPath), "lib/mock-data.ts should exist").toBe(true);
    expect(existsSync(domainPath), "lib/domain.ts should exist").toBe(true);

    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("banner")).toHaveTextContent("Narro");
    expect(screen.getByRole("banner")).not.toHaveTextContent("下一轮");
    expect(screen.getByRole("searchbox")).toHaveAccessibleName("搜索信息、实体、事件，或向 Narro 提问");
    const navigation = screen.getByRole("navigation", { name: "信息源和视角" });

    expect(navigation).toBeInTheDocument();
    const main = screen.getByRole("main");

    expect(main).toHaveAccessibleName("实时信息流");
    expect(screen.getByRole("complementary", { name: "Agent 任务" })).toBeInTheDocument();
    expect(within(main).getByText("等待第一次刷新")).toBeInTheDocument();

    expect(within(navigation).getByText("GitHub Changelog")).toBeInTheDocument();
    expect(within(navigation).getByText("Hugging Face Blog")).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: /GitHub Changelog/ })).toHaveAttribute(
      "href",
      expect.stringContaining("source=github-changelog")
    );

    expect(within(navigation).getByRole("link", { name: "AI 编程工具" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "技术趋势" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "论文研究" })).toBeInTheDocument();

    expect(screen.getByText("生成今日简报")).toBeInTheDocument();
    expect(screen.getByText("解释选中信息")).toBeInTheDocument();

    await closeDatabase();
  }, 60000);

  test("makes source filtering visible in the main workspace", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
    const { default: Home } = await import("@/app/page");

    render(await Home({ searchParams: Promise.resolve({ source: "github-changelog" }) }));

    const main = screen.getByRole("main", { name: "实时信息流" });
    expect(within(main).getByText("当前来源")).toBeInTheDocument();
    expect(within(main).getByText("GitHub Changelog")).toBeInTheDocument();
    expect(within(main).getByText("清除")).toHaveAttribute("href", "/?lens=ai-coding");

    await closeDatabase();
  }, 60000);

  test("renders real item actions and feed view links", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
    const { default: Home } = await import("@/app/page");

    render(await Home({ searchParams: Promise.resolve({}) }));

    const main = screen.getByRole("main", { name: "实时信息流" });
    expect(within(main).getByRole("link", { name: "收藏" })).toHaveAttribute("href", "/?lens=ai-coding&view=saved");
    expect(within(main).getByRole("link", { name: "待读" })).toHaveAttribute("href", "/?lens=ai-coding&view=reading");
    expect(within(main).getByRole("link", { name: "隐藏" })).toHaveAttribute("href", "/?lens=ai-coding&view=hidden");

    await closeDatabase();
  }, 60000);

  test("renders advanced filters, batch read, backup export, and event detail entry points", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();

    const database = getDatabase();
    await prepareDatabase(database);
    await insertItemIfNew(
      database,
      {
        id: "event-openai-a",
        sourceId: "hacker-news-rss",
        title: "OpenAI launches agent runtime for developers",
        url: "https://news.ycombinator.com/item?id=888",
        author: "hn-user",
        publishedAt: "2026-05-22T08:30:00.000Z",
        fetchedAt: "2026-05-22T09:00:00.000Z",
        summary: "OpenAI runtime is discussed by developers.",
        aiSummary: "",
        language: "en",
        tags: ["community", "ai"],
        entities: ["OpenAI", "Hacker News"],
        importanceScore: 92,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "test fixture",
        actionLabels: ["保存", "隐藏", "打开原文"]
      },
      "event-openai-a"
    );
    await insertItemIfNew(
      database,
      {
        id: "event-openai-b",
        sourceId: "google-ai-blog",
        title: "OpenAI agent runtime reaches research teams",
        url: "https://example.com/openai-agent-runtime",
        author: "Google AI Blog",
        publishedAt: "2026-05-22T08:00:00.000Z",
        fetchedAt: "2026-05-22T09:00:00.000Z",
        summary: "Research teams compare the agent runtime.",
        aiSummary: "",
        language: "en",
        tags: ["ai"],
        entities: ["OpenAI", "Google"],
        importanceScore: 88,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "test fixture",
        actionLabels: ["保存", "隐藏", "打开原文"]
      },
      "event-openai-b"
    );

    const { default: Home } = await import("@/app/page");
    render(await Home({ searchParams: Promise.resolve({ entity: "OpenAI", min: "80", event: "event-openai-0" }) }));

    const main = screen.getByRole("main", { name: "实时信息流" });
    expect(within(main).getByText("高级筛选")).toBeInTheDocument();
    expect(within(main).getByDisplayValue("OpenAI")).toBeInTheDocument();
    expect(within(main).getByDisplayValue("80")).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "全部标为已读" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: /查看事件详情/ })).toHaveAttribute("href", expect.stringContaining("event=event-openai-0"));
    expect(within(main).getByText("事件详情")).toBeInTheDocument();
    expect(within(main).getByText("涉及 2 条信息")).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "信息源和视角" });
    expect(within(navigation).getByRole("link", { name: "导出备份" })).toHaveAttribute("href", "/backup.json");

    await closeDatabase();
  }, 60000);

  test("renders source management, item detail links, and persisted agent actions", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();

    const database = getDatabase();
    await prepareDatabase(database);
    await insertItemIfNew(
      database,
      {
        id: "test-hn-api-item",
        sourceId: "hn-api-top-stories",
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
        actionLabels: ["保存", "隐藏", "打开原文"]
      },
      "hn-api-1001"
    );

    const { default: Home } = await import("@/app/page");
    render(await Home({ searchParams: Promise.resolve({ source: "hn-api-top-stories" }) }));

    const navigation = screen.getByRole("navigation", { name: "信息源和视角" });
    expect(within(navigation).getByRole("button", { name: /启用 HN API Top Stories/ })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /刷新 HN API Top Stories/ })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "添加 RSS" })).toBeInTheDocument();

    const main = screen.getByRole("main", { name: "实时信息流" });
    expect(within(main).getByRole("link", { name: /Show HN: Fast local AI coding workspace/ })).toHaveAttribute(
      "href",
      expect.stringContaining("item=test-hn-api-item")
    );
    expect(within(main).getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "待读" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "已读" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "隐藏" })).toBeInTheDocument();

    const agentSidebar = screen.getByRole("complementary", { name: "Agent 任务" });
    expect(within(agentSidebar).getByRole("button", { name: "运行今日简报" })).toBeInTheDocument();
    expect(within(agentSidebar).getByRole("button", { name: "运行解释" })).toBeInTheDocument();

    await closeDatabase();
  }, 60000);

  test("surfaces source health, scheduled refresh, OPML, and LLM settings controls", async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();

    const database = getDatabase();
    await prepareDatabase(database);
    await markSourceRefreshFailure(database, "hacker-news-rss", "HTTP 503", 88);
    await recordRefreshLog(database, {
      error: "HTTP 503",
      fetchedCount: 0,
      insertedCount: 0,
      latencyMs: 88,
      ok: false,
      sourceId: "hacker-news-rss"
    });
    await saveSetting(database, "llm.provider", "openai-compatible");
    await saveSetting(database, "llm.baseUrl", "https://api.example.com/v1");
    await saveSetting(database, "llm.model", "gpt-5-mini");
    await saveSetting(database, "llm.lastCheckStatus", "failing");
    await saveSetting(database, "llm.lastCheckMessage", "bad key");

    const { default: Home } = await import("@/app/page");
    render(await Home({ searchParams: Promise.resolve({}) }));

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "刷新到期源" })).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "信息源和视角" });
    expect(within(navigation).getByText("健康状态")).toBeInTheDocument();
    expect(within(navigation).getByText("刷新记录")).toBeInTheDocument();
    expect(within(navigation).getByText("degraded")).toBeInTheDocument();
    expect(within(navigation).getByText("HTTP 503")).toBeInTheDocument();
    expect(within(navigation).getByText("源质量")).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /测试 Hacker News RSS/ })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "导入 OPML" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "导出 OPML" })).toHaveAttribute("href", "/sources.opml");

    const agentSidebar = screen.getByRole("complementary", { name: "Agent 任务" });
    expect(within(agentSidebar).getByText("LLM 设置")).toBeInTheDocument();
    expect(within(agentSidebar).getByRole("button", { name: "测试模型连接" })).toBeInTheDocument();
    expect(within(agentSidebar).getByText("未连接")).toBeInTheDocument();
    expect(within(agentSidebar).getByText("failing")).toBeInTheDocument();
    expect(within(agentSidebar).getByText("bad key")).toBeInTheDocument();
    expect(within(agentSidebar).getByDisplayValue("openai-compatible")).toBeInTheDocument();
    expect(within(agentSidebar).getByDisplayValue("https://api.example.com/v1")).toBeInTheDocument();
    expect(within(agentSidebar).getByDisplayValue("gpt-5-mini")).toBeInTheDocument();

    await closeDatabase();
  }, 60000);
});
