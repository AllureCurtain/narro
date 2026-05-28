export type SourceType = "rss" | "atom" | "github" | "webpage" | "api" | "manual";

export type RankingMode = "latest" | "important" | "unread" | "event_first";

export type ReadStatus = "unread" | "reading" | "read";

export type EventStatus = "new" | "tracking" | "archived";

export type AgentTaskType =
  | "daily_brief"
  | "explain_item"
  | "track_lens"
  | "source_discovery";

export type AgentTaskStatus = "ready" | "queued" | "running" | "completed" | "failed";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  group: string;
  enabled: boolean;
  refreshIntervalMinutes: number;
  lastFetchedAt: string;
  failureCount: number;
  healthStatus: "idle" | "healthy" | "degraded" | "failing";
  itemCount: number;
  averageLatencyMs: number;
  lastError: string;
  nextRefreshAt: string;
  unreadCount: number;
}

export interface Lens {
  id: string;
  name: string;
  description: string;
  sourceGroupFilters: string[];
  keywordFilters: string[];
  entityFilters: string[];
  tagFilters: string[];
  rankingMode: RankingMode;
  active?: boolean;
  unreadCount: number;
}

export interface Item {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
  summary: string;
  aiSummary: string;
  language: "zh" | "en";
  tags: string[];
  entities: string[];
  importanceScore: number;
  duplicateGroupId?: string;
  readStatus: ReadStatus;
  saved: boolean;
  hidden: boolean;
  eventGroupId?: string;
  reason: string;
  actionLabels: string[];
}

export interface EventGroup {
  id: string;
  title: string;
  summary: string;
  itemIds: string[];
  mainEntities: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  importanceScore: number;
  sourceCount: number;
  status: EventStatus;
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  title: string;
  description: string;
  lensId?: string;
  itemId?: string;
  status: AgentTaskStatus;
  input: string;
  output?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  primary?: boolean;
}

export interface SourceInput {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  group: string;
  enabled: boolean;
  refreshIntervalMinutes: number;
  tags: string[];
  entities: string[];
}

export interface WorkspaceSummary {
  activeLensId: string;
  updatedSourceCount: number;
  totalUnreadCount: number;
  digestTitle: string;
  digestBody: string;
}

export interface RefreshActionState {
  ok: boolean;
  message: string;
  refreshedAt?: string;
}

export type DigestMode = "ai" | "empty" | "local";

export interface DigestSourceResult {
  error?: string;
  fetchedCount: number;
  insertedCount: number;
  ok: boolean;
  sourceId: string;
  sourceName: string;
}

export interface DigestActionState {
  articleCount?: number;
  digestOutput?: string;
  failedCount?: number;
  insertedCount?: number;
  mode?: DigestMode;
  ok: boolean;
  refreshedCount?: number;
  sourceResults?: DigestSourceResult[];
  message: string;
}

export interface RefreshLog {
  id: string;
  sourceId: string;
  sourceName: string;
  ok: boolean;
  fetchedCount: number;
  insertedCount: number;
  latencyMs: number;
  error: string;
  createdAt: string;
}

export interface DataSourceCandidate {
  id: string;
  name: string;
  channel: "atom" | "rss" | "api" | "webhook";
  priority: "M1" | "M2" | "later";
  coverage: string;
  sourceUrl: string;
  reason: string;
}
