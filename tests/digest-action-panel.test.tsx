import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DigestActionStatus } from "@/components/digest/digest-action-panel";

describe("digest action status", () => {
  test("shows refresh, inserted, and failed counts", () => {
    render(
      <DigestActionStatus
        state={{
          failedCount: 8,
          insertedCount: 0,
          ok: false,
          refreshedCount: 8,
          message: "已生成本地简报，引用 0 条信息；8 个源刷新失败"
        }}
      />
    );

    expect(screen.getByText("刷新 8 个源")).toBeInTheDocument();
    expect(screen.getByText("新增 0 条")).toBeInTheDocument();
    expect(screen.getByText("失败 8 个")).toBeInTheDocument();
    expect(screen.getByText(/8 个源刷新失败/)).toHaveClass("text-amber-700");
  });

  test("shows source-level refresh details", () => {
    render(
      <DigestActionStatus
        state={{
          articleCount: 1,
          failedCount: 1,
          insertedCount: 2,
          mode: "local",
          ok: true,
          refreshedCount: 2,
          message: "已生成本地简报，引用 1 条信息；1 个源刷新失败",
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

    expect(screen.getByText("Hacker News RSS")).toBeInTheDocument();
    expect(screen.getByText("8 抓取 / 2 新增")).toBeInTheDocument();
    expect(screen.getByText("Lobsters RSS")).toBeInTheDocument();
    expect(screen.getByText("HTTP 503")).toBeInTheDocument();
  });

  test("shows digest mode status", () => {
    render(
      <DigestActionStatus
        state={{
          articleCount: 0,
          failedCount: 0,
          insertedCount: 0,
          mode: "empty",
          ok: true,
          refreshedCount: 8,
          message: "已生成本地简报，引用 0 条信息"
        }}
      />
    );

    expect(screen.getByText("暂无可用文章")).toBeInTheDocument();
  });
});
