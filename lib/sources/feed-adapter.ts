import type { Item, Source } from "@/lib/domain";
import type { Fetcher, NormalizeOptions, RawSourceEntry, SourcePreset, SourcePreviewResult } from "./types";

const feedAcceptHeader = "application/atom+xml,application/rss+xml,application/xml,text/xml,*/*";
const maxSummaryLength = 180;

export function parseFeed(xml: string, sourceUrl: string): RawSourceEntry[] {
  const blocks = collectEntryBlocks(xml);

  return blocks
    .map((block) => parseBlock(block, sourceUrl))
    .filter((entry): entry is RawSourceEntry => Boolean(entry?.title && entry.url));
}

export function normalizeRawEntry(entry: RawSourceEntry, source: Source, options: NormalizeOptions): Item {
  const canonicalUrl = normalizeUrl(entry.url);
  const title = cleanText(entry.title);
  const summary = compactSummary(cleanText(entry.summary || title), maxSummaryLength);
  const entities = inferEntities(`${title} ${summary}`, options.entities ?? []);
  const importanceScore = scoreEntryImportance({ ...entry, title, summary });

  return {
    id: `${source.id}-${stableHash(entry.externalId || canonicalUrl || title)}`,
    sourceId: source.id,
    title,
    url: canonicalUrl,
    author: entry.author || source.name,
    publishedAt: entry.publishedAt,
    fetchedAt: options.fetchedAt,
    summary,
    aiSummary: "",
    language: hasCjk(title + summary) ? "zh" : "en",
    tags: options.tags ?? [],
    entities,
    importanceScore,
    readStatus: "unread",
    saved: false,
    hidden: false,
    reason: entry.metadata?.score
      ? `HN score ${entry.metadata.score}${entry.metadata.commentsCount ? ` with ${entry.metadata.commentsCount} comments` : ""}`
      : `来自已验证免费源 ${source.name}`,
    actionLabels: ["保存", "隐藏", "打开原文"]
  };
}

function scoreEntryImportance(entry: RawSourceEntry): number {
  const score = entry.metadata?.score ?? 0;
  const comments = entry.metadata?.commentsCount ?? 0;
  if (!score && !comments) {
    const text = `${entry.title} ${entry.summary}`.toLowerCase();
    const keywordWeight = [
      "ai",
      "agent",
      "agentic",
      "coding",
      "model",
      "repository",
      "governance",
      "security",
      "release",
      "breaking"
    ].reduce((total, keyword) => total + (text.includes(keyword) ? 4 : 0), 0);

    return Math.max(45, Math.min(82, 50 + keywordWeight));
  }

  return Math.max(55, Math.min(98, 50 + Math.round(Math.log10(score + 1) * 13 + Math.log10(comments + 1) * 8)));
}

export function dedupeRawEntries(entries: RawSourceEntry[]): RawSourceEntry[] {
  const seenExternalIds = new Set<string>();
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: RawSourceEntry[] = [];

  for (const entry of entries) {
    const externalId = entry.externalId.trim();
    const url = normalizeUrl(entry.url);
    const title = normalizeText(entry.title);
    const duplicate =
      (externalId && seenExternalIds.has(externalId)) || (url && seenUrls.has(url)) || (title && seenTitles.has(title));

    if (duplicate) continue;

    if (externalId) seenExternalIds.add(externalId);
    if (url) seenUrls.add(url);
    if (title) seenTitles.add(title);
    unique.push(entry);
  }

  return unique;
}

export async function fetchSourcePreview(
  source: SourcePreset,
  options: { fetcher?: Fetcher; limit?: number; timeoutMs?: number } = {}
): Promise<SourcePreviewResult> {
  const fetcher = options.fetcher ?? fetch;
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetcher(source.url, {
      headers: {
        accept: source.adapter === "json-api" ? "application/json,*/*" : feedAcceptHeader,
        "user-agent": "NarroSourceAdapter/0.1"
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000)
    });

    const text = await response.text();
    const entries =
      source.adapter === "json-api" ? [] : dedupeRawEntries(parseFeed(text, response.url || source.url)).slice(0, options.limit);

    return {
      ok: response.ok && (source.adapter === "json-api" || entries.length > 0),
      source,
      entries,
      status: response.status,
      fetchedAt
    };
  } catch (error) {
    return {
      ok: false,
      source,
      entries: [],
      status: 0,
      fetchedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function collectEntryBlocks(xml: string): string[] {
  const atomEntries = [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  if (atomEntries.length > 0) return atomEntries;

  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);
}

function parseBlock(block: string, sourceUrl: string): RawSourceEntry | null {
  const title = cleanText(tagValue(block, "title"));
  const url = cleanText(atomLink(block) || tagValue(block, "link") || tagValue(block, "id"));
  const externalId = cleanText(tagValue(block, "guid") || tagValue(block, "id") || url);
  const publishedAt = parseDate(
    tagValue(block, "updated") || tagValue(block, "published") || tagValue(block, "pubDate") || tagValue(block, "dc:date")
  );
  const author = cleanText(tagValue(block, "dc:creator") || tagValue(block, "name") || tagValue(block, "author"));
  const summary = cleanText(tagValue(block, "summary") || tagValue(block, "description") || tagValue(block, "content"));

  if (!title || !url) return null;

  return {
    title,
    url: resolveUrl(url, sourceUrl),
    externalId,
    author,
    publishedAt,
    summary,
    sourceUrl
  };
}

function atomLink(block: string): string {
  const links = [...block.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const alternate = links.find((link) => /rel=["']alternate["']/i.test(link)) ?? links[0];
  return attributeValue(alternate ?? "", "href");
}

function tagValue(block: string, tag: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));
  return match?.[1] ?? "";
}

function attributeValue(tag: string, attribute: string): string {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escapedAttribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function cleanText(value: string): string {
  const withoutScripts = value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ");

  return decodeXml(withoutScripts)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(Read more|Continue reading|阅读全文|阅读原文)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSummary(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const boundary = normalized.lastIndexOf(" ", maxLength - 3);
  const end = boundary > 80 ? boundary : maxLength - 3;

  return `${normalized.slice(0, end).trim()}...`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseDate(value: string): string {
  const parsed = new Date(cleanText(value));
  return Number.isNaN(parsed.valueOf()) ? new Date(0).toISOString() : parsed.toISOString();
}

function resolveUrl(url: string, sourceUrl: string): string {
  try {
    return new URL(url, sourceUrl).toString();
  } catch {
    return url;
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid", "ref"].includes(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function inferEntities(text: string, sourceEntities: string[]): string[] {
  const knownEntities = [
    "OpenAI",
    "Anthropic",
    "Claude",
    "Google",
    "Gemini",
    "DeepMind",
    "Microsoft",
    "GitHub",
    "Hacker News",
    "Hugging Face",
    "Meta",
    "Llama",
    "Mistral",
    "Vercel",
    "Next.js",
    "React",
    "Node.js",
    "TypeScript",
    "Rust",
    "Go",
    "Kubernetes",
    "Docker",
    "Cloudflare",
    "AWS",
    "arXiv"
  ];
  const lowerText = text.toLowerCase();
  const inferred = knownEntities.filter((entity) => lowerText.includes(entity.toLowerCase()));

  return [...new Set([...inferred, ...sourceEntities])];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function hasCjk(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}
