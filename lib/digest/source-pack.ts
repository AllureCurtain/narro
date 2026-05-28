import type { Item, Source } from "@/lib/domain";
import type { DigestEntry } from "./types";

export const techDigestSourceIds = [
  "hacker-news-rss",
  "lobsters-rss",
  "hugging-face-blog",
  "google-ai-blog",
  "aws-machine-learning-blog",
  "ollama-blog",
  "ruanyifeng-weekly",
  "infoq-cn"
] as const;

const digestSourceSet = new Set<string>(techDigestSourceIds);

interface SelectDigestEntriesOptions {
  items: Item[];
  maxEntries?: number;
  maxPerSource?: number;
  sources: Source[];
}

export function selectDigestEntries({
  items,
  maxEntries = 32,
  maxPerSource = 5,
  sources
}: SelectDigestEntriesOptions): DigestEntry[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const countBySource = new Map<string, number>();
  const selected: DigestEntry[] = [];

  const candidates = items
    .filter((item) => !item.hidden)
    .filter((item) => digestSourceSet.has(item.sourceId))
    .sort((left, right) => {
      const importanceDelta = right.importanceScore - left.importanceScore;
      if (importanceDelta !== 0) return importanceDelta;
      return new Date(right.publishedAt).valueOf() - new Date(left.publishedAt).valueOf();
    });

  for (const item of candidates) {
    const source = sourceById.get(item.sourceId);
    if (!source) continue;

    const count = countBySource.get(item.sourceId) ?? 0;
    if (count >= maxPerSource) continue;

    selected.push({ item, source });
    countBySource.set(item.sourceId, count + 1);

    if (selected.length >= maxEntries) break;
  }

  return selected;
}
