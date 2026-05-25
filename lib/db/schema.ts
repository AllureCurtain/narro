import type { AgentTaskStatus, AgentTaskType, RankingMode, ReadStatus, SourceType } from "@/lib/domain";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourcesTable = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<SourceType>().notNull(),
  url: text("url").notNull(),
  group: text("group_name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  refreshIntervalMinutes: integer("refresh_interval_minutes").notNull(),
  lastFetchedAt: text("last_fetched_at").notNull().default(""),
  failureCount: integer("failure_count").notNull().default(0),
  lastError: text("last_error").notNull().default(""),
  averageLatencyMs: integer("average_latency_ms").notNull().default(0),
  tagsJson: text("tags_json").notNull().default("[]"),
  entitiesJson: text("entities_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const itemsTable = sqliteTable("items", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  author: text("author").notNull(),
  publishedAt: text("published_at").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  summary: text("summary").notNull(),
  aiSummary: text("ai_summary").notNull().default(""),
  language: text("language").$type<"zh" | "en">().notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  entitiesJson: text("entities_json").notNull().default("[]"),
  importanceScore: integer("importance_score").notNull().default(50),
  duplicateGroupId: text("duplicate_group_id"),
  readStatus: text("read_status").$type<ReadStatus>().notNull().default("unread"),
  saved: integer("saved", { mode: "boolean" }).notNull().default(false),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  eventGroupId: text("event_group_id"),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const lensesTable = sqliteTable("lenses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sourceGroupFiltersJson: text("source_group_filters_json").notNull().default("[]"),
  keywordFiltersJson: text("keyword_filters_json").notNull().default("[]"),
  entityFiltersJson: text("entity_filters_json").notNull().default("[]"),
  tagFiltersJson: text("tag_filters_json").notNull().default("[]"),
  rankingMode: text("ranking_mode").$type<RankingMode>().notNull().default("latest"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentTasksTable = sqliteTable("agent_tasks", {
  id: text("id").primaryKey(),
  type: text("type").$type<AgentTaskType>().notNull(),
  lensId: text("lens_id"),
  itemId: text("item_id"),
  status: text("status").$type<AgentTaskStatus>().notNull(),
  input: text("input").notNull(),
  output: text("output").notNull().default(""),
  error: text("error").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const settingsTable = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const refreshLogsTable = sqliteTable("refresh_logs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  ok: integer("ok", { mode: "boolean" }).notNull(),
  fetchedCount: integer("fetched_count").notNull().default(0),
  insertedCount: integer("inserted_count").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  error: text("error").notNull().default(""),
  createdAt: text("created_at").notNull()
});

export const schema = {
  agentTasksTable,
  itemsTable,
  lensesTable,
  refreshLogsTable,
  settingsTable,
  sourcesTable
};

export type SourceRow = typeof sourcesTable.$inferSelect;
export type ItemRow = typeof itemsTable.$inferSelect;
export type LensRow = typeof lensesTable.$inferSelect;
export type AgentTaskRow = typeof agentTasksTable.$inferSelect;
export type SettingRow = typeof settingsTable.$inferSelect;
export type RefreshLogRow = typeof refreshLogsTable.$inferSelect;
