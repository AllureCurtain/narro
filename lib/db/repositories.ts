import { desc, eq } from "drizzle-orm";
import type {
  AgentTask,
  AgentTaskStatus,
  AgentTaskType,
  EventGroup,
  Item,
  Lens,
  RankingMode,
  RefreshLog,
  ReadStatus,
  Source,
  SourceInput,
  WorkspaceSummary
} from "@/lib/domain";
import { llmIsConfigured, runOpenAiCompatibleTask, type LlmRunOptions } from "@/lib/agent/llm";
import { buildDigestTaskInput } from "@/lib/digest/task-input";
import { getDefaultSourcePresets, verifiedFreeSourcePresets } from "@/lib/sources/presets";
import type { SourcePreset } from "@/lib/sources/types";
import { presetToSource } from "@/lib/sources/types";
import type { NarroDatabase } from "./client";
import { getDatabase, initializeDatabase } from "./client";
import {
  agentTasksTable,
  itemsTable,
  lensesTable,
  refreshLogsTable,
  settingsTable,
  sourcesTable,
  type AgentTaskRow,
  type ItemRow,
  type LensRow,
  type RefreshLogRow,
  type SourceRow
} from "./schema";

export interface LensInput {
  id: string;
  name: string;
  description: string;
  sourceGroupFilters: string[];
  keywordFilters: string[];
  entityFilters: string[];
  tagFilters: string[];
  rankingMode: RankingMode;
}

export interface WorkspaceData {
  activeLens: Lens;
  agentTasks: AgentTask[];
  eventGroups: EventGroup[];
  items: Item[];
  lenses: Lens[];
  refreshLogs: RefreshLog[];
  settings: Record<string, string>;
  sources: Source[];
  summary: WorkspaceSummary;
}

export type FeedView = "all" | "hidden" | "reading" | "saved" | "unread";

export interface ListItemsOptions {
  entity?: string;
  lensId?: string;
  limit?: number;
  minImportance?: number;
  search?: string;
  since?: string;
  sourceId?: string;
  tag?: string;
  view?: FeedView;
}

export interface RunAgentTaskInput {
  itemId?: string;
  lensId?: string;
  type: AgentTaskType;
}

export interface WorkspaceBackup {
  agentTasks: AgentTask[];
  exportedAt: string;
  items: Item[];
  lenses: Lens[];
  refreshLogs: RefreshLog[];
  settings: Record<string, string>;
  sources: Source[];
  version: 1;
}

export interface RecordRefreshLogInput {
  error?: string;
  fetchedCount: number;
  insertedCount: number;
  latencyMs: number;
  ok: boolean;
  sourceId: string;
}

export interface LlmConnectionResult {
  message: string;
  ok: boolean;
  status: "healthy" | "failing";
}

export async function prepareDatabase(database = getDatabase()) {
  await initializeDatabase(database);
  await seedDatabase(database);
}

export async function seedDatabase(database = getDatabase()) {
  const now = new Date().toISOString();
  const existingSources = await database.db.select({ id: sourcesTable.id }).from(sourcesTable).limit(1);

  if (existingSources.length === 0) {
    await database.db.insert(sourcesTable).values(
      getDefaultSourcePresets().map((preset) => {
        const source = presetToSource(preset);
        return {
          id: source.id,
          name: source.name,
          type: source.type,
          url: source.url,
          group: presetGroupName(preset),
          enabled: isRecommendedMvpSource(preset.id),
          refreshIntervalMinutes: preset.refreshIntervalMinutes,
          lastFetchedAt: "",
          failureCount: 0,
          lastError: "",
          averageLatencyMs: 0,
          tagsJson: stringify(preset.tags),
          entitiesJson: stringify(preset.entities),
          createdAt: now,
          updatedAt: now
        };
      })
    );
  }

  const existingLenses = await database.db.select({ id: lensesTable.id }).from(lensesTable).limit(1);
  if (existingLenses.length === 0) {
    await database.db.insert(lensesTable).values(defaultLenses(now));
  }
}

export async function listSources(database = getDatabase()): Promise<Source[]> {
  const rows = await database.db.select().from(sourcesTable).orderBy(sourcesTable.group, sourcesTable.name);
  const itemRows = await database.db.select().from(itemsTable);
  const counts = new Map<string, { itemCount: number; unreadCount: number }>();

  for (const item of itemRows) {
    const count = counts.get(item.sourceId) ?? { itemCount: 0, unreadCount: 0 };
    count.itemCount += 1;
    if (item.readStatus === "unread" && !item.hidden) count.unreadCount += 1;
    counts.set(item.sourceId, count);
  }

  const sources = rows
    .map((row) => sourceFromRow(row, counts.get(row.id)))
    .sort((left, right) => Number(right.enabled) - Number(left.enabled) || left.group.localeCompare(right.group) || left.name.localeCompare(right.name));
  const allUnread = sources.reduce((total, source) => total + source.unreadCount, 0);
  const allCount = sources.reduce((total, source) => total + source.itemCount, 0);

  return [
    {
      id: "all",
      name: "全部来源",
      type: "manual",
      url: "narro://all",
      group: "全部",
      enabled: true,
      refreshIntervalMinutes: 15,
      lastFetchedAt: sources[0]?.lastFetchedAt ?? "",
      failureCount: 0,
      healthStatus: sources.some((source) => source.healthStatus === "healthy") ? "healthy" : "idle",
      itemCount: allCount,
      averageLatencyMs: Math.round(sources.reduce((total, source) => total + source.averageLatencyMs, 0) / Math.max(1, sources.length)),
      lastError: "",
      nextRefreshAt: "",
      unreadCount: allUnread
    },
    ...sources
  ];
}

export async function listRealSources(database = getDatabase()): Promise<Source[]> {
  const sources = await listSources(database);
  return sources.filter((source) => source.id !== "all");
}

export async function getSource(database: NarroDatabase, sourceId: string): Promise<Source | null> {
  const [row] = await database.db.select().from(sourcesTable).where(eq(sourcesTable.id, sourceId)).limit(1);
  return row ? sourceFromRow(row) : null;
}

export async function getSourcePreset(sourceId: string): Promise<SourcePreset | null> {
  return verifiedFreeSourcePresets.find((source) => source.id === sourceId) ?? null;
}

export async function createSource(database: NarroDatabase, input: SourceInput): Promise<Source> {
  const now = new Date().toISOString();
  await database.db
    .insert(sourcesTable)
    .values({
      id: input.id,
      name: input.name,
      type: input.type,
      url: input.url,
      group: input.group,
      enabled: input.enabled,
      refreshIntervalMinutes: input.refreshIntervalMinutes,
      lastFetchedAt: "",
      failureCount: 0,
      lastError: "",
      averageLatencyMs: 0,
      tagsJson: stringify(input.tags),
      entitiesJson: stringify(input.entities),
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: sourcesTable.id,
      set: {
        name: input.name,
        type: input.type,
        url: input.url,
        group: input.group,
        enabled: input.enabled,
        refreshIntervalMinutes: input.refreshIntervalMinutes,
        tagsJson: stringify(input.tags),
        entitiesJson: stringify(input.entities),
        updatedAt: now
      }
    });

  const source = await getSource(database, input.id);
  if (!source) throw new Error(`Failed to create source ${input.id}`);
  return source;
}

export async function updateSourceEnabled(database: NarroDatabase, sourceId: string, enabled: boolean) {
  await database.db
    .update(sourcesTable)
    .set({ enabled, updatedAt: new Date().toISOString() })
    .where(eq(sourcesTable.id, sourceId));
}

export async function listLenses(database = getDatabase(), activeLensId = "ai-coding"): Promise<Lens[]> {
  const rows = await database.db.select().from(lensesTable).orderBy(lensesTable.createdAt);
  const allItems = await listItems(database, {});

  return rows.map((row) => {
    const lens = lensFromRow(row, row.id === activeLensId);
    return {
      ...lens,
      unreadCount: filterItemsForLens(allItems, lens, awaitFreeSourceMapPlaceholder).length
    };
  });
}

export async function createLens(database: NarroDatabase, input: LensInput) {
  const now = new Date().toISOString();
  await database.db
    .insert(lensesTable)
    .values(lensValues(input, now))
    .onConflictDoUpdate({
      target: lensesTable.id,
      set: {
        name: input.name,
        description: input.description,
        sourceGroupFiltersJson: stringify(input.sourceGroupFilters),
        keywordFiltersJson: stringify(input.keywordFilters),
        entityFiltersJson: stringify(input.entityFilters),
        tagFiltersJson: stringify(input.tagFilters),
        rankingMode: input.rankingMode,
        updatedAt: now
      }
    });
}

export async function deleteLens(database: NarroDatabase, lensId: string) {
  if (["ai-coding", "tech-trends", "research-watch", "security-watch", "chinese-tech"].includes(lensId)) return;
  await database.db.delete(lensesTable).where(eq(lensesTable.id, lensId));
}

export async function insertItemIfNew(database: NarroDatabase, item: Item, externalId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await database.client.execute({
    sql: `
      insert or ignore into items (
        id, source_id, external_id, title, url, author, published_at, fetched_at, summary, ai_summary,
        language, tags_json, entities_json, importance_score, duplicate_group_id, read_status, saved,
        hidden, event_group_id, reason, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      item.id,
      item.sourceId,
      externalId,
      item.title,
      item.url,
      item.author,
      item.publishedAt,
      item.fetchedAt,
      item.summary,
      item.aiSummary,
      item.language,
      stringify(item.tags),
      stringify(item.entities),
      item.importanceScore,
      item.duplicateGroupId ?? null,
      item.readStatus,
      item.saved ? 1 : 0,
      item.hidden ? 1 : 0,
      item.eventGroupId ?? null,
      item.reason,
      now,
      now
    ]
  });

  return result.rowsAffected > 0;
}

export async function updateItemAiSummary(database: NarroDatabase, itemId: string, aiSummary: string) {
  await database.db
    .update(itemsTable)
    .set({ aiSummary, updatedAt: new Date().toISOString() })
    .where(eq(itemsTable.id, itemId));
}

export async function listItemsWithoutAiSummary(database: NarroDatabase, limit = 20): Promise<Item[]> {
  const rows = await database.db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.aiSummary, ""))
    .orderBy(desc(itemsTable.publishedAt))
    .limit(limit);
  return rows.map(itemFromRow);
}

export async function markSourceRefreshSuccess(database: NarroDatabase, sourceId: string, fetchedAt: string, latencyMs = 0) {
  await database.db
    .update(sourcesTable)
    .set({
      averageLatencyMs: Math.max(0, Math.round(latencyMs)),
      lastError: "",
      lastFetchedAt: fetchedAt,
      failureCount: 0,
      updatedAt: new Date().toISOString()
    })
    .where(eq(sourcesTable.id, sourceId));
}

export async function markSourceRefreshFailure(database: NarroDatabase, sourceId: string, error = "Refresh failed", latencyMs = 0) {
  const source = await getSource(database, sourceId);
  await database.db
    .update(sourcesTable)
    .set({
      averageLatencyMs: Math.max(0, Math.round(latencyMs)),
      failureCount: (source?.failureCount ?? 0) + 1,
      lastError: compactDisplayText(error, 180),
      updatedAt: new Date().toISOString()
    })
    .where(eq(sourcesTable.id, sourceId));
}

export async function recordRefreshLog(database: NarroDatabase, input: RecordRefreshLogInput): Promise<RefreshLog> {
  const now = new Date(Date.now() + refreshLogSequence).toISOString();
  refreshLogSequence = (refreshLogSequence + 1) % 1000;
  const id = `refresh-${stableHash(`${input.sourceId}-${now}-${input.ok}-${input.fetchedCount}-${input.insertedCount}`)}`;

  await database.db.insert(refreshLogsTable).values({
    id,
    sourceId: input.sourceId,
    ok: input.ok,
    fetchedCount: input.fetchedCount,
    insertedCount: input.insertedCount,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    error: compactDisplayText(input.error ?? "", 180),
    createdAt: now
  });

  const [row] = await database.db.select().from(refreshLogsTable).where(eq(refreshLogsTable.id, id)).limit(1);
  return refreshLogFromRow(row, await sourceNameMap(database));
}

export async function saveSetting(database: NarroDatabase, key: string, value: string) {
  const now = new Date().toISOString();
  await database.db
    .insert(settingsTable)
    .values({ key, value, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value, updatedAt: now }
    });
}

export async function listSettings(database = getDatabase()): Promise<Record<string, string>> {
  const rows = await database.db.select().from(settingsTable).orderBy(settingsTable.key);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function listRefreshLogs(
  database = getDatabase(),
  options: { limit?: number; sourceId?: string } = {}
): Promise<RefreshLog[]> {
  const rows = await database.db
    .select()
    .from(refreshLogsTable)
    .orderBy(desc(refreshLogsTable.createdAt))
    .limit(options.limit ?? 10);
  const filtered = options.sourceId ? rows.filter((row) => row.sourceId === options.sourceId) : rows;
  const names = await sourceNameMap(database);

  return filtered.map((row) => refreshLogFromRow(row, names));
}

export async function testLlmConnection(
  database: NarroDatabase,
  options: LlmRunOptions = {}
): Promise<LlmConnectionResult> {
  const settings = await listSettings(database);
  const llmSettings = {
    provider: settings["llm.provider"],
    baseUrl: settings["llm.baseUrl"],
    model: settings["llm.model"]
  };
  const result = await runOpenAiCompatibleTask(
    llmSettings,
    {
      items: [],
      selectedItem: null,
      taskInput: "连接测试",
      type: "daily_brief"
    },
    options
  );
  const status = result.ok ? "healthy" : "failing";
  const message = result.ok
    ? `模型 ${llmSettings.model} 连接正常`
    : result.error ?? "模型连接失败";

  await saveSetting(database, "llm.lastCheckStatus", status);
  await saveSetting(database, "llm.lastCheckMessage", message);
  await saveSetting(database, "llm.lastCheckedAt", new Date().toISOString());

  return { ok: result.ok, status, message };
}

export async function importSourcesFromOpml(database: NarroDatabase, opml: string): Promise<string[]> {
  const outlines = [...opml.matchAll(/<outline\b[^>]*>/gi)].map((match) => match[0]);
  const imported: string[] = [];

  for (const outline of outlines) {
    const url = decodeXml(attributeValue(outline, "xmlUrl") || attributeValue(outline, "xmlurl"));
    if (!url) continue;

    const name = decodeXml(attributeValue(outline, "title") || attributeValue(outline, "text") || new URL(url).hostname);
    const id = normalizeSourceId(name);
    await createSource(database, {
      id,
      name,
      type: url.toLowerCase().includes("atom") ? "atom" : "rss",
      url,
      group: "自定义",
      enabled: true,
      refreshIntervalMinutes: 120,
      tags: ["imported"],
      entities: [name]
    });
    imported.push(id);
  }

  return imported;
}

export async function exportSourcesToOpml(database = getDatabase()): Promise<string> {
  const sources = (await listRealSources(database)).filter((source) => source.type === "rss" || source.type === "atom");
  const outlines = sources
    .map(
      (source) =>
        `    <outline text="${escapeXml(source.name)}" title="${escapeXml(source.name)}" type="rss" xmlUrl="${escapeXml(source.url)}" />`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>Narro Sources</title></head>\n  <body>\n${outlines}\n  </body>\n</opml>`;
}

export async function updateItemState(
  database: NarroDatabase,
  itemId: string,
  state: { hidden?: boolean; readStatus?: ReadStatus; saved?: boolean }
) {
  const update: Partial<typeof itemsTable.$inferInsert> = {
    updatedAt: new Date().toISOString()
  };

  if (typeof state.hidden === "boolean") update.hidden = state.hidden;
  if (typeof state.saved === "boolean") update.saved = state.saved;
  if (state.readStatus) update.readStatus = state.readStatus;

  await database.db.update(itemsTable).set(update).where(eq(itemsTable.id, itemId));
}

export async function markItemsReadStatus(database: NarroDatabase, itemIds: string[], readStatus: ReadStatus) {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  for (const itemId of uniqueIds) {
    await updateItemState(database, itemId, { readStatus });
  }
}

export async function listItems(
  database = getDatabase(),
  options: ListItemsOptions = {}
): Promise<Item[]> {
  const rows = await database.db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.publishedAt))
    .limit(250);
  const sources = await listRealSources(database);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const items = rows.map(itemFromRow);
  const lens = options.lensId ? await getLens(database, options.lensId) : null;

  const visibleItems = options.view === "hidden" ? items.filter((item) => item.hidden) : items.filter((item) => !item.hidden);
  const viewItems = filterItemsForView(visibleItems, options.view ?? "all");
  const enabledItems = options.sourceId ? viewItems : viewItems.filter((item) => sourceById.get(item.sourceId)?.enabled);
  let filtered = lens ? filterItemsForLens(enabledItems, lens, sourceById) : enabledItems;

  if (options.sourceId && options.sourceId !== "all") {
    filtered = filtered.filter((item) => item.sourceId === options.sourceId);
  }

  if (options.search) {
    const query = options.search.toLowerCase();
    filtered = filtered.filter((item) => searchableText(item).includes(query));
  }

  if (options.entity) {
    const entity = options.entity.toLowerCase();
    filtered = filtered.filter((item) => item.entities.some((itemEntity) => itemEntity.toLowerCase().includes(entity)));
  }

  if (options.tag) {
    const tag = options.tag.toLowerCase();
    filtered = filtered.filter((item) => item.tags.some((itemTag) => itemTag.toLowerCase() === tag));
  }

  if (typeof options.minImportance === "number") {
    filtered = filtered.filter((item) => item.importanceScore >= Number(options.minImportance));
  }

  if (options.since) {
    const since = new Date(options.since).valueOf();
    if (!Number.isNaN(since)) {
      filtered = filtered.filter((item) => new Date(item.publishedAt).valueOf() >= since);
    }
  }

  return sortItemsForLens(filtered, lens).slice(0, options.limit ?? 60);
}

export async function listDigestItems(
  database = getDatabase(),
  options: { limit?: number; search?: string } = {}
): Promise<Item[]> {
  const rows = await database.db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.publishedAt))
    .limit(options.limit ?? 120);

  let items = rows.map(itemFromRow).filter((item) => !item.hidden);

  if (options.search) {
    const query = options.search.toLowerCase();
    items = items.filter((item) => searchableText(item).includes(query));
  }

  return items;
}

export async function getWorkspaceData(
  database = getDatabase(),
  options: ListItemsOptions & { itemId?: string } = {}
): Promise<WorkspaceData> {
  await prepareDatabase(database);

  const lensId = options.lensId ?? "ai-coding";
  const sources = await listSources(database);
  const lenses = await listLensesWithCounts(database, lensId);
  const activeLens = lenses.find((lens) => lens.id === lensId) ?? lenses[0];
  const items = await listItems(database, {
    lensId: activeLens.id,
    entity: options.entity,
    minImportance: options.minImportance,
    search: options.search,
    since: options.since,
    sourceId: options.sourceId,
    tag: options.tag,
    view: options.view,
    limit: 40
  });
  const eventGroups = buildEventGroups(items);
  const enabledSources = sources.filter((source) => source.id !== "all" && source.enabled);
  const agentTasks = await listAgentTasks(database, { itemId: options.itemId, lensId: activeLens.id });
  const refreshLogs = await listRefreshLogs(database, { limit: 5 });
  const settings = await listSettings(database);

  return {
    activeLens,
    agentTasks,
    eventGroups,
    items,
    lenses,
    refreshLogs,
    settings,
    sources,
    summary: buildWorkspaceSummary(activeLens, items, eventGroups, enabledSources)
  };
}

export async function exportWorkspaceBackup(database = getDatabase()): Promise<WorkspaceBackup> {
  await prepareDatabase(database);

  return {
    agentTasks: await listAgentTasks(database, { limit: 250 }),
    exportedAt: new Date().toISOString(),
    items: await listItems(database, { limit: 1000, view: "all" }),
    lenses: await listLensesWithCounts(database, "ai-coding"),
    refreshLogs: await listRefreshLogs(database, { limit: 1000 }),
    settings: await listSettings(database),
    sources: await listSources(database),
    version: 1
  };
}

export async function getItem(database: NarroDatabase, itemId: string): Promise<Item | null> {
  const [row] = await database.db.select().from(itemsTable).where(eq(itemsTable.id, itemId)).limit(1);
  return row ? itemFromRow(row) : null;
}

export async function listAgentTasks(
  database = getDatabase(),
  options: { itemId?: string; lensId?: string; limit?: number } = {}
): Promise<AgentTask[]> {
  const rows = await database.db
    .select()
    .from(agentTasksTable)
    .orderBy(desc(agentTasksTable.updatedAt))
    .limit(options.limit ?? 10);

  const filtered = rows.filter((row) => {
    if (options.itemId && row.itemId === options.itemId) return true;
    if (options.lensId && row.lensId === options.lensId) return true;
    return !options.itemId && !options.lensId;
  });

  const tasks = filtered.map(agentTaskFromRow);
  return tasks.length > 0 ? tasks : defaultAgentTasks(options.lensId, options.itemId);
}

export async function runAgentTask(
  database: NarroDatabase,
  input: RunAgentTaskInput,
  options: LlmRunOptions = {}
): Promise<AgentTask> {
  const now = new Date().toISOString();
  const items = await listItems(database, { lensId: input.lensId, limit: 12 });
  const selectedItem = input.itemId ? await getItem(database, input.itemId) : items[0] ?? null;
  const settings = await listSettings(database);
  const { taskInput, output, error, status } = await buildAgentOutput(database, input, items, selectedItem, settings, options);
  const id = `task-${input.type}-${stableHash(`${input.lensId ?? "all"}-${input.itemId ?? "none"}-${now}`)}`;

  await database.db.insert(agentTasksTable).values({
    id,
    type: input.type,
    lensId: input.lensId ?? null,
    itemId: input.itemId ?? null,
    status,
    input: taskInput,
    output: output ?? "",
    error: error ?? "",
    createdAt: now,
    updatedAt: now
  });

  const [row] = await database.db.select().from(agentTasksTable).where(eq(agentTasksTable.id, id)).limit(1);
  return agentTaskFromRow(row);
}

export async function createDigestTask(
  database: NarroDatabase,
  input: {
    error?: string;
    lensId: string;
    output: string;
    referenceItemIds?: string[];
    status: AgentTaskStatus;
  }
): Promise<AgentTask> {
  const now = new Date().toISOString();
  const id = `digest-${stableHash(`${now}-${input.output}`)}`;

  await database.db.insert(agentTasksTable).values({
    id,
    type: "daily_brief",
    lensId: input.lensId,
    itemId: null,
    status: input.status,
    input: buildDigestTaskInput(input.referenceItemIds ?? []),
    output: input.output,
    error: input.error ?? "",
    createdAt: now,
    updatedAt: now
  });

  const [row] = await database.db.select().from(agentTasksTable).where(eq(agentTasksTable.id, id)).limit(1);
  return agentTaskFromRow(row);
}

async function getLens(database: NarroDatabase, lensId: string): Promise<Lens | null> {
  const [row] = await database.db.select().from(lensesTable).where(eq(lensesTable.id, lensId)).limit(1);
  return row ? lensFromRow(row, true) : null;
}

async function listLensesWithCounts(database: NarroDatabase, activeLensId: string): Promise<Lens[]> {
  const rows = await database.db.select().from(lensesTable).orderBy(lensesTable.createdAt);
  const allItems = (await database.db.select().from(itemsTable).where(eq(itemsTable.hidden, false))).map(itemFromRow);
  const sources = await listRealSources(database);
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return rows.map((row) => {
    const lens = lensFromRow(row, row.id === activeLensId);
    return { ...lens, unreadCount: filterItemsForLens(allItems, lens, sourceById).length };
  });
}

function sourceFromRow(row: SourceRow, counts: { itemCount: number; unreadCount: number } = { itemCount: 0, unreadCount: 0 }): Source {
  const nextRefreshAt = nextRefreshIso(row.lastFetchedAt, row.refreshIntervalMinutes);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    group: row.group,
    enabled: row.enabled,
    refreshIntervalMinutes: row.refreshIntervalMinutes,
    lastFetchedAt: row.lastFetchedAt,
    failureCount: row.failureCount,
    healthStatus: sourceHealthStatus(row.failureCount, row.lastFetchedAt),
    itemCount: counts.itemCount,
    averageLatencyMs: row.averageLatencyMs,
    lastError: row.lastError,
    nextRefreshAt,
    unreadCount: counts.unreadCount
  };
}

function itemFromRow(row: ItemRow): Item {
  const savedLabel = row.saved ? "取消保存" : "保存";
  const readLabel = row.readStatus === "read" ? "标为未读" : "已读";
  const readingLabel = row.readStatus === "reading" ? "取消待读" : "待读";
  const hiddenLabel = row.hidden ? "恢复" : "隐藏";

  return {
    id: row.id,
    sourceId: row.sourceId,
    title: row.title,
    url: row.url,
    author: row.author,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
    summary: compactDisplayText(row.summary, 240),
    aiSummary: row.aiSummary,
    language: row.language,
    tags: parseJsonArray(row.tagsJson),
    entities: parseJsonArray(row.entitiesJson),
    importanceScore: row.importanceScore,
    duplicateGroupId: row.duplicateGroupId ?? undefined,
    readStatus: row.readStatus,
    saved: row.saved,
    hidden: row.hidden,
    eventGroupId: row.eventGroupId ?? undefined,
    reason: row.reason,
    actionLabels: [savedLabel, readingLabel, readLabel, hiddenLabel, "打开原文"]
  };
}

function agentTaskFromRow(row: AgentTaskRow): AgentTask {
  return {
    id: row.id,
    type: row.type,
    title: taskTitle(row.type),
    description: taskDescription(row.type),
    lensId: row.lensId ?? undefined,
    itemId: row.itemId ?? undefined,
    status: row.status,
    input: row.input,
    output: row.output || undefined,
    error: row.error || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    primary: row.type === "daily_brief"
  };
}

function refreshLogFromRow(row: RefreshLogRow, names: Map<string, string>): RefreshLog {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceName: names.get(row.sourceId) ?? row.sourceId,
    ok: row.ok,
    fetchedCount: row.fetchedCount,
    insertedCount: row.insertedCount,
    latencyMs: row.latencyMs,
    error: row.error,
    createdAt: row.createdAt
  };
}

async function sourceNameMap(database: NarroDatabase): Promise<Map<string, string>> {
  const rows = await database.db.select({ id: sourcesTable.id, name: sourcesTable.name }).from(sourcesTable);
  return new Map(rows.map((row) => [row.id, row.name]));
}

function compactDisplayText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const boundary = normalized.lastIndexOf(" ", maxLength - 3);
  const end = boundary > 80 ? boundary : maxLength - 3;

  return `${normalized.slice(0, end).trim()}...`;
}

function lensFromRow(row: LensRow, active: boolean): Lens {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceGroupFilters: parseJsonArray(row.sourceGroupFiltersJson),
    keywordFilters: parseJsonArray(row.keywordFiltersJson),
    entityFilters: parseJsonArray(row.entityFiltersJson),
    tagFilters: parseJsonArray(row.tagFiltersJson),
    rankingMode: row.rankingMode,
    active,
    unreadCount: 0
  };
}

function filterItemsForLens(items: Item[], lens: Lens, sourceById: Map<string, Source>): Item[] {
  return items.filter((item) => {
    const source = sourceById.get(item.sourceId);
    const text = `${item.title} ${item.summary} ${item.entities.join(" ")} ${item.tags.join(" ")}`.toLowerCase();

    const groupMatches =
      lens.sourceGroupFilters.length === 0 || (source ? lens.sourceGroupFilters.includes(source.group) : false);
    const keywordMatches =
      lens.keywordFilters.length === 0 || lens.keywordFilters.some((keyword) => text.includes(keyword.toLowerCase()));
    const entityMatches =
      lens.entityFilters.length === 0 ||
      lens.entityFilters.some((entity) => item.entities.some((e) => e.toLowerCase().includes(entity.toLowerCase())));
    const tagMatches =
      lens.tagFilters.length === 0 || lens.tagFilters.some((tag) => item.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));

    return groupMatches && keywordMatches && entityMatches && tagMatches;
  });
}

function filterItemsForView(items: Item[], view: "all" | "hidden" | "reading" | "saved" | "unread"): Item[] {
  if (view === "saved") return items.filter((item) => item.saved);
  if (view === "reading") return items.filter((item) => item.readStatus === "reading");
  if (view === "unread") return items.filter((item) => item.readStatus === "unread");
  return items;
}

function searchableText(item: Item): string {
  return `${item.title} ${item.summary} ${item.aiSummary} ${item.author} ${item.tags.join(" ")} ${item.entities.join(" ")}`.toLowerCase();
}

function sortItemsForLens(items: Item[], lens: Lens | null): Item[] {
  const mode = lens?.rankingMode;
  return [...items].sort((left, right) => {
    if (mode === "unread") {
      const unreadDelta = Number(right.readStatus === "unread") - Number(left.readStatus === "unread");
      if (unreadDelta !== 0) return unreadDelta;
    }

    if (mode === "important" || mode === "event_first") {
      const eventDelta = Number(Boolean(right.eventGroupId)) - Number(Boolean(left.eventGroupId));
      if (mode === "event_first" && eventDelta !== 0) return eventDelta;

      const importanceDelta = right.importanceScore - left.importanceScore;
      if (importanceDelta !== 0) return importanceDelta;
    }

    return new Date(right.publishedAt).valueOf() - new Date(left.publishedAt).valueOf();
  });
}

function buildEventGroups(items: Item[]): EventGroup[] {
  const clusters = clusterByEntityOverlap(items);

  return clusters
    .sort((left, right) => Math.max(...right.map((item) => item.importanceScore)) - Math.max(...left.map((item) => item.importanceScore)))
    .slice(0, 4)
    .map((groupedItems, index) => {
      const sourceCount = new Set(groupedItems.map((item) => item.sourceId)).size;
      const mainEntities = [...new Set(groupedItems.flatMap((item) => item.entities))].slice(0, 4);
      const label = mainEntities[0] ?? groupedItems[0].title.slice(0, 20);
      const id = `event-${stableSlug(label)}-${index}`;

      for (const item of groupedItems) {
        item.eventGroupId = id;
      }

      return {
        id,
        title: `${label} 相关信息正在聚合`,
        summary: `${groupedItems.length} 条信息来自 ${sourceCount} 个来源，适合持续追踪和对比。`,
        itemIds: groupedItems.map((item) => item.id),
        mainEntities,
        firstSeenAt: groupedItems.at(-1)?.publishedAt ?? groupedItems[0].publishedAt,
        lastSeenAt: groupedItems[0].publishedAt,
        importanceScore: Math.max(...groupedItems.map((item) => item.importanceScore)),
        sourceCount,
        status: "new"
      };
    });
}

function clusterByEntityOverlap(items: Item[]): Item[][] {
  const links = new Map<number, Set<number>>();
  const clusters: Item[][] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (itemsShareSignal(items[i], items[j])) {
        addClusterLink(links, i, j);
      }
    }
  }

  const visited = new Set<number>();
  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;

    const component = collectLinkedItems(items, links, i, visited);

    if (component.length > 1 && new Set(component.map((item) => item.sourceId)).size > 1) {
      clusters.push(component);
    }
  }

  return clusters;
}

function addClusterLink(links: Map<number, Set<number>>, left: number, right: number) {
  links.set(left, (links.get(left) ?? new Set()).add(right));
  links.set(right, (links.get(right) ?? new Set()).add(left));
}

function collectLinkedItems(items: Item[], links: Map<number, Set<number>>, start: number, visited: Set<number>): Item[] {
  const component: Item[] = [];
  const stack = [start];

  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    if (visited.has(index)) continue;

    visited.add(index);
    component.push(items[index]);

    for (const next of links.get(index) ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }

  return component;
}

function itemsShareSignal(a: Item, b: Item): boolean {
  if (a.entities.length > 0 && b.entities.length > 0) {
    const shared = a.entities.filter((e) => b.entities.some((be) => be.toLowerCase() === e.toLowerCase()));
    if (shared.length >= 1) return true;
  }

  const aWords = significantWords(a.title);
  const bWords = significantWords(b.title);
  const overlap = aWords.filter((w) => bWords.includes(w));
  return overlap.length >= 3;
}

function buildWorkspaceSummary(activeLens: Lens, items: Item[], eventGroups: EventGroup[], sources: Source[]): WorkspaceSummary {
  const topEntities = [...new Set(items.flatMap((item) => item.entities))].slice(0, 4);

  return {
    activeLensId: activeLens.id,
    updatedSourceCount: sources.filter((source) => source.lastFetchedAt).length || sources.length,
    totalUnreadCount: items.filter((item) => item.readStatus === "unread").length,
    digestTitle: items.length > 0 ? `${activeLens.name} 实时摘要` : "等待第一次刷新",
    digestBody:
      items.length > 0
        ? `当前 Lens 命中 ${items.length} 条真实入库信息，形成 ${eventGroups.length} 个事件组。重点实体：${topEntities.join("、") || "暂无"}。`
        : "点击顶部刷新按钮后，Narro 会从已验证免费源读取 RSS/Atom 并写入本地数据库。"
  };
}

function defaultLenses(now: string) {
  return [
    lensValues(
      {
        id: "ai-coding",
        name: "AI 编程工具",
        description: "关注 AI、agentic coding、模型生态、IDE、代码平台和工程治理。",
        sourceGroupFilters: ["模型厂商", "产品更新", "代码动态", "社区讨论", "工程技术", "API", "自定义"],
        keywordFilters: ["ai", "agent", "code", "coding", "model", "github", "hn", "show hn", "repository", "release", "governance"],
        entityFilters: [],
        tagFilters: [],
        rankingMode: "event_first"
      },
      now
    ),
    lensValues(
      {
        id: "tech-trends",
        name: "技术趋势",
        description: "看框架、运行时、云平台和工程实践的长期变化。",
        sourceGroupFilters: ["工程技术", "代码动态", "产品更新"],
        keywordFilters: ["runtime", "framework", "release", "compiler", "cloud", "database"],
        entityFilters: [],
        tagFilters: [],
        rankingMode: "latest"
      },
      now
    ),
    lensValues(
      {
        id: "research-watch",
        name: "论文研究",
        description: "跟踪 AI、NLP、机器学习和软件工程论文。",
        sourceGroupFilters: ["论文研究"],
        keywordFilters: [],
        entityFilters: [],
        tagFilters: [],
        rankingMode: "latest"
      },
      now
    ),
    lensValues(
      {
        id: "security-watch",
        name: "安全公告",
        description: "跟踪官方安全公告、开发者安全和基础设施风险。",
        sourceGroupFilters: ["安全公告"],
        keywordFilters: [],
        entityFilters: [],
        tagFilters: [],
        rankingMode: "important"
      },
      now
    ),
    lensValues(
      {
        id: "chinese-tech",
        name: "中文技术",
        description: "中文高信号技术内容、团队博客和科技新闻。",
        sourceGroupFilters: ["中文技术"],
        keywordFilters: [],
        entityFilters: [],
        tagFilters: [],
        rankingMode: "latest"
      },
      now
    )
  ];
}

function lensValues(input: LensInput, timestamp: string) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    sourceGroupFiltersJson: stringify(input.sourceGroupFilters),
    keywordFiltersJson: stringify(input.keywordFilters),
    entityFiltersJson: stringify(input.entityFilters),
    tagFiltersJson: stringify(input.tagFilters),
    rankingMode: input.rankingMode,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function presetGroupName(preset: SourcePreset): string {
  if (preset.group === "api") return "API";
  if (preset.group === "release") return "代码动态";
  if (preset.name.startsWith("arXiv")) return "论文研究";
  if (preset.tags.includes("security")) return "安全公告";
  if (preset.tags.includes("zh")) return "中文技术";
  if (preset.tags.includes("community")) return "社区讨论";
  if (preset.tags.includes("ai") || preset.tags.includes("local-models")) return "模型厂商";
  if (preset.tags.includes("changelog") || preset.tags.includes("platform")) return "产品更新";
  return "工程技术";
}

function isRecommendedMvpSource(id: string): boolean {
  return new Set([
    "hacker-news-rss",
    "lobsters-rss",
    "hugging-face-blog",
    "google-ai-blog",
    "cloudflare-blog",
    "aws-machine-learning-blog",
    "ollama-blog",
    "arxiv-cs-ai",
    "arxiv-cs-cl",
    "arxiv-cs-lg",
    "ruanyifeng-weekly",
    "infoq-cn",
    "meituan-tech",
    "solidot"
  ]).has(id);
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function stringify(value: string[]): string {
  return JSON.stringify(value);
}

function sourceHealthStatus(failureCount: number, lastFetchedAt: string): Source["healthStatus"] {
  if (failureCount >= 3) return "failing";
  if (failureCount > 0) return "degraded";
  if (lastFetchedAt) return "healthy";
  return "idle";
}

function nextRefreshIso(lastFetchedAt: string, refreshIntervalMinutes: number): string {
  if (!lastFetchedAt) return "";
  const next = new Date(lastFetchedAt).valueOf() + refreshIntervalMinutes * 60_000;
  return Number.isNaN(next) ? "" : new Date(next).toISOString();
}

function significantWords(text: string): string[] {
  const stopWords = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "your", "our", "new", "show", "launches", "ships", "how", "what", "why", "are", "was", "has", "have", "been"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function attributeValue(tag: string, attribute: string): string {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escapedAttribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function normalizeSourceId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || `source-${Date.now()}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function stableSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, "-").replace(/^-|-$/g, "") || "topic";
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function defaultAgentTasks(lensId?: string, itemId?: string): AgentTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: "task-daily-brief-ready",
      type: "daily_brief",
      title: taskTitle("daily_brief"),
      description: taskDescription("daily_brief"),
      lensId,
      status: "ready",
      input: "当前 Lens 的近期高信号信息",
      createdAt: now,
      updatedAt: now,
      primary: true
    },
    {
      id: "task-explain-item-ready",
      type: "explain_item",
      title: taskTitle("explain_item"),
      description: taskDescription("explain_item"),
      lensId,
      itemId,
      status: "ready",
      input: itemId ? "当前选中信息" : "选择一条信息后解释",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "task-track-lens-ready",
      type: "track_lens",
      title: taskTitle("track_lens"),
      description: taskDescription("track_lens"),
      lensId,
      status: "ready",
      input: "当前 Lens 的来源、关键词和实体",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "task-source-discovery-ready",
      type: "source_discovery",
      title: taskTitle("source_discovery"),
      description: taskDescription("source_discovery"),
      lensId,
      status: "ready",
      input: "当前 Lens 的高频主题",
      createdAt: now,
      updatedAt: now
    }
  ];
}

async function buildAgentOutput(
  database: NarroDatabase,
  input: RunAgentTaskInput,
  items: Item[],
  selectedItem: Item | null,
  settings: Record<string, string>,
  options: LlmRunOptions
): Promise<{ error?: string; output?: string; status: AgentTask["status"]; taskInput: string }> {
  const taskInput = taskInputForAgent(input, items, selectedItem);
  const llmSettings = {
    provider: settings["llm.provider"],
    baseUrl: settings["llm.baseUrl"],
    model: settings["llm.model"]
  };

  if (llmIsConfigured(llmSettings, options)) {
    const result = await runOpenAiCompatibleTask(
      llmSettings,
      {
        items,
        selectedItem,
        taskInput,
        type: input.type
      },
      options
    );

    return result.ok
      ? { taskInput, output: result.output, status: "completed" }
      : { taskInput, error: result.error ?? "LLM task failed", status: "failed" };
  }

  if (input.type === "explain_item") {
    const item = selectedItem ?? items[0];
    return {
      taskInput,
      output: item
        ? `${item.title}：这条信息来自 ${item.author}，重要性 ${item.importanceScore}。核心摘要：${item.summary}`
        : "当前没有可解释的信息。",
      status: "completed"
    };
  }

  if (input.type === "track_lens") {
    return {
      taskInput,
      output: `已为 ${input.lensId ?? "当前视角"} 建立本地追踪基线，后续会记录新增信息、主题变化和高频实体。`,
      status: "completed"
    };
  }

  if (input.type === "source_discovery") {
    const sources = await listRealSources(database);
    const enabled = sources.filter((source) => source.enabled).slice(0, 6).map((source) => source.name).join("、");
    return {
      taskInput,
      output: `当前可先提高这些源的权重：${enabled || "暂无启用源"}。后续新增源应优先选择官方 RSS/Atom 或免费公开 API。`,
      status: "completed"
    };
  }

  const topItems = items.slice(0, 5);
  return {
    taskInput,
    output:
      topItems.length > 0
        ? `今日简报：${topItems.map((item, index) => `${index + 1}. ${item.title}`).join(" ")}`
        : "今日简报：当前 Lens 还没有可用信息，请先刷新信息源。",
    status: "completed"
  };
}

function taskInputForAgent(input: RunAgentTaskInput, items: Item[], selectedItem: Item | null): string {
  if (input.type === "explain_item") return selectedItem?.title ?? items[0]?.title ?? "没有选中信息";
  if (input.type === "track_lens" || input.type === "source_discovery") return input.lensId ?? "all";
  return `${input.lensId ?? "当前 Lens"} 的 ${items.slice(0, 5).length} 条近期信息`;
}

function taskTitle(type: AgentTaskType): string {
  return {
    daily_brief: "生成今日简报",
    explain_item: "解释选中信息",
    track_lens: "创建持续追踪",
    source_discovery: "发现新信息源"
  }[type];
}

function taskDescription(type: AgentTaskType): string {
  return {
    daily_brief: "基于当前 Lens 生成可回链的本地简报。",
    explain_item: "解释单条信息的背景、实体和可能影响。",
    track_lens: "把当前 Lens 保存为持续追踪任务。",
    source_discovery: "根据近期主题推荐可接入的免费公开源。"
  }[type];
}

const awaitFreeSourceMapPlaceholder = new Map<string, Source>();

let refreshLogSequence = 0;
