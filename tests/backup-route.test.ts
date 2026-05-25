import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { insertItemIfNew, prepareDatabase, saveSetting } from "@/lib/db/repositories";

describe("backup export route", () => {
  const originalDbUrl = process.env.NARRO_DB_URL;

  beforeEach(async () => {
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
  });

  afterEach(async () => {
    process.env.NARRO_DB_URL = originalDbUrl;
    await closeDatabase();
  });

  test("returns a JSON backup of the local workspace", async () => {
    const database = getDatabase();
    await prepareDatabase(database);
    await saveSetting(database, "llm.model", "gpt-5-mini");
    await insertItemIfNew(
      database,
      {
        id: "backup-route-item",
        sourceId: "hacker-news-rss",
        title: "Show HN: Backup route exports local data",
        url: "https://news.ycombinator.com/item?id=777",
        author: "hn-user",
        publishedAt: "2026-05-22T08:30:00.000Z",
        fetchedAt: "2026-05-22T09:00:00.000Z",
        summary: "A backup route should include local items.",
        aiSummary: "",
        language: "en",
        tags: ["community"],
        entities: ["Hacker News"],
        importanceScore: 80,
        readStatus: "unread",
        saved: false,
        hidden: false,
        reason: "test fixture",
        actionLabels: ["保存", "隐藏", "打开原文"]
      },
      "backup-route-item"
    );

    const { GET } = await import("@/app/backup.json/route");
    const response = await GET();
    const body = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.version).toBe(1);
    expect(body.items.map((item: { id: string }) => item.id)).toContain("backup-route-item");
    expect(body.settings["llm.model"]).toBe("gpt-5-mini");
  });
});
