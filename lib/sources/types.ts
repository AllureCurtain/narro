import type { Source } from "@/lib/domain";

export type SourcePresetGroup = "default" | "release" | "api" | "optional";

export type SourceAdapterKind = "feed" | "json-api";

export type SourceAccessKind = "feed" | "api" | "crawler";

export type SourceFormat = "rss" | "atom" | "json";

export interface SourcePreset {
  id: string;
  name: string;
  group: SourcePresetGroup;
  adapter: SourceAdapterKind;
  access: SourceAccessKind;
  format: SourceFormat;
  url: string;
  free: boolean;
  verified: boolean;
  priority: "M1" | "M2" | "optional";
  refreshIntervalMinutes: number;
  coverage: string;
  tags: string[];
  entities: string[];
  quality: "high" | "medium";
}

export interface RawSourceEntry {
  title: string;
  url: string;
  externalId: string;
  author: string;
  publishedAt: string;
  summary: string;
  sourceUrl: string;
  metadata?: {
    commentsCount?: number;
    score?: number;
  };
}

export interface SourcePreviewResult {
  ok: boolean;
  source: SourcePreset;
  entries: RawSourceEntry[];
  status: number;
  fetchedAt: string;
  error?: string;
}

export interface NormalizeOptions {
  fetchedAt: string;
  tags?: string[];
  entities?: string[];
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export function presetToSource(preset: SourcePreset): Source {
  const type = preset.adapter === "json-api" ? "api" : preset.format === "atom" ? "atom" : "rss";

  return {
    id: preset.id,
    name: preset.name,
    type,
    url: preset.url,
    group: preset.group,
    enabled: preset.group !== "optional",
    refreshIntervalMinutes: preset.refreshIntervalMinutes,
    lastFetchedAt: "",
    failureCount: 0,
    healthStatus: "idle",
    itemCount: 0,
    averageLatencyMs: 0,
    lastError: "",
    nextRefreshAt: "",
    unreadCount: 0
  };
}
