import type { Fetcher, RawSourceEntry, SourcePreset } from "./types";

interface HackerNewsStory {
  by?: string;
  descendants?: number;
  id: number;
  score?: number;
  text?: string;
  time?: number;
  title?: string;
  type?: string;
  url?: string;
}

export async function fetchJsonApiEntries(
  source: SourcePreset,
  options: { fetcher?: Fetcher; limit?: number; timeoutMs?: number } = {}
): Promise<{ entries: RawSourceEntry[]; status: number }> {
  if (!source.id.startsWith("hn-api-")) {
    return { entries: [], status: 422 };
  }

  return fetchHackerNewsStories(source, options);
}

async function fetchHackerNewsStories(
  source: SourcePreset,
  options: { fetcher?: Fetcher; limit?: number; timeoutMs?: number }
): Promise<{ entries: RawSourceEntry[]; status: number }> {
  const fetcher = options.fetcher ?? fetch;
  const listResponse = await fetcher(source.url, {
    headers: {
      accept: "application/json,*/*",
      "user-agent": "NarroSourceAdapter/0.1"
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000)
  });

  if (!listResponse.ok) {
    return { entries: [], status: listResponse.status };
  }

  const ids = await listResponse.json() as unknown;
  if (!Array.isArray(ids)) return { entries: [], status: 422 };

  const storyIds = ids.filter((id): id is number => typeof id === "number").slice(0, options.limit ?? 30);
  const stories = await runWithConcurrency(storyIds, 8, async (id) => {
    const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
    const response = await fetcher(itemUrl, {
      headers: {
        accept: "application/json,*/*",
        "user-agent": "NarroSourceAdapter/0.1"
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000)
    });

    if (!response.ok) return null;
    return response.json() as Promise<HackerNewsStory>;
  });

  return {
    entries: stories
      .filter((story): story is HackerNewsStory => Boolean(story?.id && story.title && story.type === "story"))
      .map((story) => ({
        title: story.title ?? `HN story ${story.id}`,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        externalId: String(story.id),
        author: story.by ?? "Hacker News",
        publishedAt: new Date((story.time ?? 0) * 1000).toISOString(),
        summary: story.text || `${story.score ?? 0} points and ${story.descendants ?? 0} comments on Hacker News.`,
        sourceUrl: source.url,
        metadata: {
          commentsCount: story.descendants ?? 0,
          score: story.score ?? 0
        }
      })),
    status: listResponse.status
  };
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, runWorker));
  return results;
}
