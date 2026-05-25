import { describe, expect, test, vi } from "vitest";
import type { Source } from "@/lib/domain";
import {
  dedupeRawEntries,
  fetchSourcePreview,
  normalizeRawEntry,
  parseFeed
} from "@/lib/sources/feed-adapter";
import { verifiedFreeSourcePresets } from "@/lib/sources/presets";

const source: Source = {
  id: "github-changelog",
  name: "GitHub Changelog",
  type: "rss",
  url: "https://github.blog/changelog/feed/",
  group: "产品更新",
  enabled: true,
  refreshIntervalMinutes: 30,
  lastFetchedAt: "2026-05-24T12:00:00+08:00",
  failureCount: 0,
  healthStatus: "healthy",
  itemCount: 0,
  averageLatencyMs: 120,
  lastError: "",
  nextRefreshAt: "2026-05-24T12:30:00+08:00",
  unreadCount: 0
};

const rssSample = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>GitHub Changelog</title>
    <item>
      <title><![CDATA[New repository rules]]></title>
      <link>https://github.blog/changelog/new-repository-rules</link>
      <guid>rules-1</guid>
      <pubDate>Fri, 22 May 2026 08:30:00 GMT</pubDate>
      <dc:creator>GitHub</dc:creator>
      <description><![CDATA[Repository rules now support more controls.]]></description>
    </item>
  </channel>
</rss>`;

const atomSample = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Release notes from pnpm</title>
  <entry>
    <title>v11.2.2</title>
    <id>tag:github.com,2008:Repository/123/v11.2.2</id>
    <updated>2026-05-24T01:12:00Z</updated>
    <author><name>pnpm bot</name></author>
    <link rel="alternate" href="https://github.com/pnpm/pnpm/releases/tag/v11.2.2" />
    <content type="html">Fix package manager behavior.</content>
  </entry>
</feed>`;

describe("feed source adapter", () => {
  test("parses RSS entries into raw source entries", () => {
    const entries = parseFeed(rssSample, "https://github.blog/changelog/feed/");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "New repository rules",
      url: "https://github.blog/changelog/new-repository-rules",
      externalId: "rules-1",
      author: "GitHub",
      summary: "Repository rules now support more controls."
    });
    expect(entries[0].publishedAt).toBe("2026-05-22T08:30:00.000Z");
  });

  test("parses Atom entries and normalizes them into Narro items", () => {
    const [entry] = parseFeed(atomSample, "https://github.com/pnpm/pnpm/releases.atom");
    const item = normalizeRawEntry(entry, source, {
      fetchedAt: "2026-05-24T12:00:00.000Z",
      tags: ["release", "package-manager"],
      entities: ["pnpm", "GitHub"]
    });
    const sameItem = normalizeRawEntry(entry, source, {
      fetchedAt: "2026-05-24T12:00:00.000Z",
      tags: ["release", "package-manager"],
      entities: ["pnpm", "GitHub"]
    });

    expect(item.id).toBe(sameItem.id);
    expect(item.id).toMatch(/^github-changelog-[a-z0-9]+$/);
    expect(item.sourceId).toBe(source.id);
    expect(item.title).toBe("v11.2.2");
    expect(item.url).toBe("https://github.com/pnpm/pnpm/releases/tag/v11.2.2");
    expect(item.publishedAt).toBe("2026-05-24T01:12:00.000Z");
    expect(item.tags).toEqual(["release", "package-manager"]);
    expect(item.entities).toEqual(["pnpm", "GitHub"]);
    expect(item.actionLabels).toEqual(["保存", "隐藏", "打开原文"]);
  });

  test("normalizes verbose feed bodies into bounded card summaries", () => {
    const item = normalizeRawEntry(
      {
        title: "2026-05-21, Version 24.16.0",
        url: "https://github.com/nodejs/node/releases/tag/v24.16.0",
        externalId: "node-24-16-0",
        author: "Node.js",
        publishedAt: "2026-05-21T08:00:00.000Z",
        sourceUrl: "https://github.com/nodejs/node/releases.atom",
        summary: `Notable Changes ${"SEMVER-MINOR crypto implement randomUUIDv7 debugger stream compose ".repeat(80)}`
      },
      source,
      {
        fetchedAt: "2026-05-24T12:00:00.000Z",
        tags: ["release", "runtime"],
        entities: ["Node.js"]
      }
    );

    expect(item.summary.length).toBeLessThanOrEqual(260);
    expect(item.summary).toContain("Notable Changes");
  });

  test("cleans noisy HTML and feed boilerplate before card display", () => {
    const item = normalizeRawEntry(
      {
        title: "<![CDATA[OpenAI ships a new agent runtime]]>",
        url: "https://example.com/openai-agent-runtime?utm_source=rss&utm_campaign=noise#comments",
        externalId: "openai-agent-runtime",
        author: "Example",
        publishedAt: "2026-05-24T08:00:00.000Z",
        sourceUrl: "https://example.com/feed.xml",
        summary:
          "<p>OpenAI released a new runtime for production agents.</p><p>Read more</p><script>alert('x')</script>"
      },
      source,
      {
        fetchedAt: "2026-05-24T12:00:00.000Z",
        tags: ["ai", "agent"],
        entities: ["OpenAI"]
      }
    );

    expect(item.title).toBe("OpenAI ships a new agent runtime");
    expect(item.url).toBe("https://example.com/openai-agent-runtime");
    expect(item.summary).toBe("OpenAI released a new runtime for production agents.");
    expect(item.summary.length).toBeLessThanOrEqual(180);
  });

  test("scores high-signal AI coding feed entries above generic baseline", () => {
    const item = normalizeRawEntry(
      {
        title: "Agentic coding model ships better repository context",
        url: "https://example.com/agentic-coding-model-context",
        externalId: "agentic-coding-context",
        author: "Example",
        publishedAt: "2026-05-24T08:00:00.000Z",
        sourceUrl: "https://example.com/feed.xml",
        summary: "AI coding agents now handle repository context, governance, and release workflows."
      },
      source,
      {
        fetchedAt: "2026-05-24T12:00:00.000Z",
        tags: ["ai", "developer-tooling"],
        entities: ["AI", "GitHub"]
      }
    );

    expect(item.importanceScore).toBeGreaterThan(60);
  });

  test("dedupes entries by external id and canonical URL", () => {
    const entries = parseFeed(rssSample, source.url);
    const duplicateById = { ...entries[0], title: "Updated title" };
    const duplicateByUrl = { ...entries[0], externalId: "other-id" };

    expect(dedupeRawEntries([entries[0], duplicateById, duplicateByUrl])).toHaveLength(1);
  });

  test("fetches a source preview with an injected fetch implementation", async () => {
    const preset = verifiedFreeSourcePresets.find((candidate) => candidate.id === "github-changelog");
    expect(preset).toBeDefined();

    const fetcher = vi.fn(async () => new Response(rssSample, { status: 200 }));
    const result = await fetchSourcePreview(preset!, { fetcher, limit: 5 });

    expect(fetcher).toHaveBeenCalledWith(
      "https://github.blog/changelog/feed/",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: expect.stringContaining("application/atom+xml")
        })
      })
    );
    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.source.url).toBe("https://github.blog/changelog/feed/");
  });
});
