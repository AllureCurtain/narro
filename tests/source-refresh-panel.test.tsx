import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SourceRefreshStatus } from "@/components/digest/source-refresh-panel";

describe("source refresh panel", () => {
  test("shows source refresh details without digest language", () => {
    render(
      <SourceRefreshStatus
        state={{
          failedCount: 1,
          insertedCount: 2,
          ok: true,
          refreshedCount: 2,
          message: "已尝试获取最新信息；1 个源刷新失败，新增 2 条",
          sourceResults: [
            {
              sourceId: "hacker-news-rss",
              sourceName: "Hacker News RSS",
              ok: true,
              fetchedCount: 8,
              insertedCount: 2
            },
            {
              sourceId: "lobsters-rss",
              sourceName: "Lobsters RSS",
              ok: false,
              fetchedCount: 0,
              insertedCount: 0,
              error: "HTTP 503"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("已尝试获取最新信息；1 个源刷新失败，新增 2 条")).toBeInTheDocument();
    expect(screen.getByText("Hacker News RSS")).toBeInTheDocument();
    expect(screen.getByText("8 抓取 / 2 新增")).toBeInTheDocument();
    expect(screen.getByText("Lobsters RSS")).toBeInTheDocument();
    expect(screen.getByText("HTTP 503")).toBeInTheDocument();
    expect(screen.queryByText("AI 简报")).not.toBeInTheDocument();
  });
});
