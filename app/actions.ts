"use server";

import { revalidatePath } from "next/cache";
import type { RefreshActionState, SourceType } from "@/lib/domain";
import {
  createLens,
  createSource,
  deleteLens,
  importSourcesFromOpml,
  listItemsWithoutAiSummary,
  listSettings,
  markItemsReadStatus,
  prepareDatabase,
  runAgentTask,
  saveSetting,
  testLlmConnection,
  updateItemAiSummary,
  updateItemState,
  updateSourceEnabled
} from "@/lib/db/repositories";
import { getDatabase } from "@/lib/db/client";
import { refreshDueSources, refreshEnabledSources, refreshSource } from "@/lib/ingestion/refresh";
import { summarizeItemsBatch } from "@/lib/agent/summarize";

export async function refreshEnabledSourcesAction(): Promise<RefreshActionState> {
  const database = getDatabase();
  await prepareDatabase(database);
  const results = await refreshEnabledSources(database, { concurrency: 4, limit: 8, timeoutMs: 8000 });

  revalidatePath("/");

  return formatRefreshState(results);
}

export async function refreshDueSourcesAction(): Promise<RefreshActionState> {
  const database = getDatabase();
  await prepareDatabase(database);
  const results = await refreshDueSources(database, { concurrency: 4, limit: 12, timeoutMs: 8000 });

  revalidatePath("/");

  if (results.length === 0) {
    return {
      ok: true,
      message: "没有到期源",
      refreshedAt: new Date().toISOString()
    };
  }

  return formatRefreshState(results);
}

export async function refreshSourceAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  if (!sourceId) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await refreshSource(database, sourceId);
  revalidatePath("/");
}

export async function updateItemStateAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;

  const database = getDatabase();
  await prepareDatabase(database);

  const savedValue = formData.get("saved");
  const hiddenValue = formData.get("hidden");
  const readStatus = formData.get("readStatus");

  await updateItemState(database, itemId, {
    saved: savedValue === null ? undefined : savedValue === "true",
    hidden: hiddenValue === null ? undefined : hiddenValue === "true",
    readStatus: readStatus === null ? undefined : readStatus === "read" || readStatus === "reading" || readStatus === "unread" ? readStatus : undefined
  });

  revalidatePath("/");
}

export async function markVisibleItemsReadAction(formData: FormData) {
  const itemIds = String(formData.get("itemIds") ?? "")
    .split(",")
    .map((itemId) => itemId.trim())
    .filter(Boolean);
  if (itemIds.length === 0) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await markItemsReadStatus(database, itemIds, "read");
  revalidatePath("/");
}

export async function toggleSourceEnabledAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  if (!sourceId) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await updateSourceEnabled(database, sourceId, String(formData.get("enabled")) === "true");
  revalidatePath("/");
}

export async function addCustomSourceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name || !url) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await createSource(database, {
    id: normalizeSourceId(name, url),
    name,
    type: sourceTypeFromUrl(url),
    url,
    group: String(formData.get("group") || "自定义").trim() || "自定义",
    enabled: true,
    refreshIntervalMinutes: Number(formData.get("refreshIntervalMinutes") || 60),
    tags: splitField(formData.get("tags")),
    entities: splitField(formData.get("entities"))
  });
  revalidatePath("/");
}

export async function importSourcesFromOpmlAction(formData: FormData) {
  const opml = String(formData.get("opml") ?? "").trim();
  if (!opml) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await importSourcesFromOpml(database, opml);
  revalidatePath("/");
}

export async function saveLlmSettingsAction(formData: FormData) {
  const database = getDatabase();
  await prepareDatabase(database);

  await saveSetting(database, "llm.provider", String(formData.get("provider") || "openai-compatible").trim());
  await saveSetting(database, "llm.baseUrl", String(formData.get("baseUrl") || "").trim());
  await saveSetting(database, "llm.model", String(formData.get("model") || "").trim());

  revalidatePath("/");
}

export async function testLlmConnectionAction() {
  const database = getDatabase();
  await prepareDatabase(database);
  await testLlmConnection(database);
  revalidatePath("/");
}

export async function summarizeUnsummarizedItemsAction() {
  const database = getDatabase();
  await prepareDatabase(database);

  const items = await listItemsWithoutAiSummary(database, 20);
  if (items.length === 0) {
    revalidatePath("/");
    return;
  }

  const settings = await listSettings(database);
  const llmSettings = {
    provider: settings["llm.provider"],
    baseUrl: settings["llm.baseUrl"],
    model: settings["llm.model"]
  };

  const summaries = await summarizeItemsBatch(items, { settings: llmSettings, batchSize: 5 });
  for (const [itemId, summary] of summaries) {
    if (summary) await updateItemAiSummary(database, itemId, summary);
  }

  revalidatePath("/");
}

export async function runAgentTaskAction(formData: FormData) {
  const type = String(formData.get("type") ?? "");
  if (type !== "daily_brief" && type !== "explain_item" && type !== "track_lens" && type !== "source_discovery") return;

  const database = getDatabase();
  await prepareDatabase(database);
  await runAgentTask(database, {
    type,
    lensId: String(formData.get("lensId") || "") || undefined,
    itemId: String(formData.get("itemId") || "") || undefined
  });
  revalidatePath("/");
}

export async function saveLensAction(formData: FormData) {
  const database = getDatabase();
  await prepareDatabase(database);

  const id = normalizeLensId(String(formData.get("id") || formData.get("name") || "custom-lens"));
  const name = String(formData.get("name") || "自定义 Lens").trim();
  const description = String(formData.get("description") || "自定义信息过滤视角").trim();

  await createLens(database, {
    id,
    name,
    description,
    sourceGroupFilters: splitField(formData.get("sourceGroupFilters")),
    keywordFilters: splitField(formData.get("keywordFilters")),
    entityFilters: splitField(formData.get("entityFilters")),
    tagFilters: splitField(formData.get("tagFilters")),
    rankingMode: "latest"
  });

  revalidatePath("/");
}

export async function deleteLensAction(formData: FormData) {
  const lensId = String(formData.get("lensId") ?? "");
  if (!lensId) return;

  const database = getDatabase();
  await prepareDatabase(database);
  await deleteLens(database, lensId);
  revalidatePath("/");
}

function splitField(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLensId(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "custom-lens";
}

function normalizeSourceId(name: string, url: string): string {
  const normalized = `${name}-${url}`
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return normalized || `custom-${Date.now()}`;
}

function sourceTypeFromUrl(url: string): SourceType {
  return url.toLowerCase().includes("atom") ? "atom" : "rss";
}

function formatRefreshState(results: Array<{ insertedCount: number; ok: boolean }>): RefreshActionState {
  const successCount = results.filter((result) => result.ok).length;
  const failedCount = results.length - successCount;
  const insertedCount = results.reduce((total, result) => total + result.insertedCount, 0);

  return {
    ok: failedCount === 0,
    message:
      failedCount === 0
        ? `刷新 ${results.length} 个源，新增 ${insertedCount} 条`
        : `刷新 ${results.length} 个源，成功 ${successCount} 个，失败 ${failedCount} 个`,
    refreshedAt: new Date().toISOString()
  };
}
