import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { createSource, listItems, prepareDatabase } from "@/lib/db/repositories";

declare global {
  var __narroTestRefreshFetcher: typeof fetch | undefined;
}

const rssSample = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Custom Feed</title>
    <item>
      <title>Show HN: Cron refreshed AI coding source</title>
      <link>https://example.com/cron-ai-coding-source</link>
      <guid>cron-ai-coding-source</guid>
      <pubDate>Fri, 22 May 2026 08:30:00 GMT</pubDate>
      <description>Cron refresh should write due source items.</description>
    </item>
  </channel>
</rss>`;

describe("refresh API route", () => {
  const originalSecret = process.env.NARRO_REFRESH_SECRET;
  const originalDbUrl = process.env.NARRO_DB_URL;

  beforeEach(async () => {
    process.env.NARRO_REFRESH_SECRET = "secret";
    process.env.NARRO_DB_URL = "file::memory:";
    await closeDatabase();
  });

  afterEach(async () => {
    process.env.NARRO_REFRESH_SECRET = originalSecret;
    process.env.NARRO_DB_URL = originalDbUrl;
    await closeDatabase();
  });

  test("rejects refresh requests without the configured secret", async () => {
    const { GET } = await import("@/app/api/refresh/route");
    const response = await GET(new Request("http://narro.test/api/refresh"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "Unauthorized"
    });
  });

  test("accepts bearer authorization for scheduled refresh requests", async () => {
    const database = getDatabase();
    await prepareDatabase(database);
    await database.client.execute("update sources set enabled = 0");

    const { GET } = await import("@/app/api/refresh/route");
    const response = await GET(
      new Request("http://narro.test/api/refresh", {
        headers: {
          authorization: "Bearer secret"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      refreshed: 0
    });
  });

  test("refreshes due sources and returns a machine-readable report", async () => {
    const database = getDatabase();
    await prepareDatabase(database);
    await createSource(database, {
      id: "cron-source",
      name: "Cron Source",
      type: "rss",
      url: "https://example.com/cron.xml",
      group: "自定义",
      enabled: true,
      refreshIntervalMinutes: 1,
      tags: ["ai"],
      entities: ["Cron"]
    });
    await database.client.execute("update sources set enabled = 0 where id != 'cron-source'");

    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));
    globalThis.__narroTestRefreshFetcher = fetcher;

    const { GET } = await import("@/app/api/refresh/route");
    const response = await GET(new Request("http://narro.test/api/refresh?secret=secret&limit=3"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      refreshed: 1,
      inserted: 1,
      failed: 0
    });
    expect(body.results[0]).toMatchObject({
      sourceId: "cron-source",
      ok: true,
      insertedCount: 1
    });
    expect(await listItems(database, { sourceId: "cron-source" })).toHaveLength(1);

    delete globalThis.__narroTestRefreshFetcher;
  });
});
