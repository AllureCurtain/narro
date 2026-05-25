import type { Fetcher, SourcePreset } from "@/lib/sources/types";
import type { NarroDatabase } from "@/lib/db/client";
import {
  getSource,
  getSourcePreset,
  insertItemIfNew,
  listRealSources,
  markSourceRefreshFailure,
  markSourceRefreshSuccess,
  recordRefreshLog
} from "@/lib/db/repositories";
import { fetchJsonApiEntries } from "@/lib/sources/api-adapter";
import { fetchSourcePreview, normalizeRawEntry } from "@/lib/sources/feed-adapter";

const highSignalRefreshOrder = [
  "hacker-news-rss",
  "hn-api-top-stories",
  "hn-api-new-stories",
  "lobsters-rss",
  "hugging-face-blog",
  "google-ai-blog",
  "aws-machine-learning-blog",
  "ollama-blog",
  "cloudflare-blog",
  "ruanyifeng-weekly",
  "infoq-cn",
  "meituan-tech",
  "solidot",
  "arxiv-cs-ai",
  "arxiv-cs-cl",
  "arxiv-cs-lg",
  "nextjs-blog",
  "react-blog",
  "nodejs-releases",
  "typescript-blog",
  "github-changelog",
  "vercel-changelog",
  "github-release-nextjs",
  "github-release-react",
  "github-release-nodejs",
  "github-release-typescript",
  "github-release-pnpm",
  "github-release-vite",
  "github-release-drizzle-orm",
  "github-release-openai-node"
];

export interface RefreshOptions {
  concurrency?: number;
  fetcher?: Fetcher;
  limit?: number;
  now?: Date;
  timeoutMs?: number;
}

export interface RefreshResult {
  sourceId: string;
  ok: boolean;
  fetchedCount: number;
  insertedCount: number;
  error?: string;
}

export async function refreshSource(
  database: NarroDatabase,
  sourceId: string,
  options: RefreshOptions = {}
): Promise<RefreshResult> {
  const source = await getSource(database, sourceId);
  const preset = await getSourcePreset(sourceId);
  const startedAt = Date.now();

  if (!source) {
    return { sourceId, ok: false, fetchedCount: 0, insertedCount: 0, error: "Source not found" };
  }
  const sourcePreset = preset ?? sourceToFeedPreset(source);

  const preview = sourcePreset.adapter === "json-api"
    ? await fetchApiSourcePreview(sourcePreset, options)
    : await fetchSourcePreview(sourcePreset, {
        fetcher: options.fetcher,
        limit: options.limit ?? 30,
        timeoutMs: options.timeoutMs
      });
  if (!preview.ok) {
    const latencyMs = Date.now() - startedAt;
    const error = preview.error ?? `HTTP ${preview.status}`;
    await markSourceRefreshFailure(database, sourceId, error, latencyMs);
    await recordRefreshLog(database, {
      error,
      fetchedCount: 0,
      insertedCount: 0,
      latencyMs,
      ok: false,
      sourceId
    });
    return {
      sourceId,
      ok: false,
      fetchedCount: 0,
      insertedCount: 0,
      error
    };
  }

  let insertedCount = 0;
  for (const entry of preview.entries) {
    const item = normalizeRawEntry(entry, source, {
      fetchedAt: preview.fetchedAt,
      tags: sourcePreset.tags,
      entities: sourcePreset.entities
    });
    const inserted = await insertItemIfNew(database, item, entry.externalId);
    if (inserted) insertedCount += 1;
  }

  const latencyMs = Date.now() - startedAt;
  await markSourceRefreshSuccess(database, sourceId, preview.fetchedAt, latencyMs);
  await recordRefreshLog(database, {
    fetchedCount: preview.entries.length,
    insertedCount,
    latencyMs,
    ok: true,
    sourceId
  });

  return {
    sourceId,
    ok: true,
    fetchedCount: preview.entries.length,
    insertedCount
  };
}

function sourceToFeedPreset(source: NonNullable<Awaited<ReturnType<typeof getSource>>>): SourcePreset {
  return {
    id: source.id,
    name: source.name,
    group: "default",
    adapter: "feed",
    access: "feed",
    format: source.type === "atom" ? "atom" : "rss",
    url: source.url,
    free: true,
    verified: true,
    priority: "M1",
    refreshIntervalMinutes: source.refreshIntervalMinutes,
    coverage: "用户添加的自定义 RSS/Atom 源",
    tags: ["custom"],
    entities: [source.name],
    quality: "high"
  };
}

async function fetchApiSourcePreview(preset: SourcePreset, options: RefreshOptions) {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await fetchJsonApiEntries(preset, {
      fetcher: options.fetcher,
      limit: options.limit ?? 30,
      timeoutMs: options.timeoutMs
    });

    return {
      ok: result.status >= 200 && result.status < 300 && result.entries.length > 0,
      source: preset,
      entries: result.entries,
      status: result.status,
      fetchedAt
    };
  } catch (error) {
    return {
      ok: false,
      source: preset,
      entries: [],
      status: 0,
      fetchedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function refreshEnabledSources(database: NarroDatabase, options: RefreshOptions = {}): Promise<RefreshResult[]> {
  const sources = sortSourcesForRefresh((await listRealSources(database)).filter((source) => source.enabled)).slice(
    0,
    options.limit ?? 10
  );
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, sources.length || 1));

  return runWithConcurrency(sources, concurrency, (source) => refreshSource(database, source.id, options));
}

export async function refreshDueSources(database: NarroDatabase, options: RefreshOptions = {}): Promise<RefreshResult[]> {
  const now = options.now ?? new Date();
  const sources = sortSourcesForRefresh((await listRealSources(database)).filter((source) => source.enabled && sourceRefreshIsDue(source, now))).slice(
    0,
    options.limit ?? 10
  );
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, sources.length || 1));

  return runWithConcurrency(sources, concurrency, (source) => refreshSource(database, source.id, options));
}

export function sourceToPresetLike(sourceId: string, preset: SourcePreset) {
  return { sourceId, preset };
}

function sortSourcesForRefresh<T extends { id: string; name: string }>(sources: T[]): T[] {
  const priorityById = new Map(highSignalRefreshOrder.map((id, index) => [id, index]));

  return [...sources].sort((left, right) => {
    const leftPriority = priorityById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityById.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    return leftPriority - rightPriority || left.name.localeCompare(right.name);
  });
}

function sourceRefreshIsDue(source: Awaited<ReturnType<typeof listRealSources>>[number], now: Date): boolean {
  if (!source.lastFetchedAt) return true;

  const lastFetched = new Date(source.lastFetchedAt).valueOf();
  if (Number.isNaN(lastFetched)) return true;

  return now.valueOf() - lastFetched >= source.refreshIntervalMinutes * 60_000;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, runWorker));

  return results;
}
