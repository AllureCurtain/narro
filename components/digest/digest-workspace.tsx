import type { AgentTask, Item, Source } from "@/lib/domain";
import { selectDigestEntries } from "@/lib/digest/source-pack";
import { parseDigestTaskMode, parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import { articleDomId, ArticleList } from "./article-list";
import { DigestActionPanel } from "./digest-action-panel";
import { DigestCard } from "./digest-card";
import { ModelSettingsForm } from "./model-settings-form";
import { SourceRefreshPanel } from "./source-refresh-panel";

interface DigestWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function DigestWorkspace({ agentTasks, items, settings, sources }: DigestWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const digestMode = latestDigest ? parseDigestTaskMode(latestDigest.input) : undefined;
  const storedReferenceItemIds = latestDigest ? parseDigestTaskReferenceIds(latestDigest.input) : [];
  const storedReferenceItems = itemsFromStoredReferenceIds(items, storedReferenceItemIds);
  const selectedReferenceItems = selectDigestEntries({ items, sources }).map((entry) => entry.item);
  const referenceItems = storedReferenceItemIds.length > 0 ? storedReferenceItems : selectedReferenceItems;
  const streamItems = uniqueItemsById([...items.slice(0, 40), ...referenceItems]);
  const citationHrefs = new Map(referenceItems.map((item, index) => [index + 1, `#${articleDomId(item)}`]));

  return (
    <main aria-label="今日科技信息" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <SourceRefreshPanel />
      <ArticleList
        emptyMessage="还没有文章。点击获取最新信息会先刷新默认科技源。"
        heading="最新文章"
        items={streamItems}
        sources={sources}
      />
      <section aria-label="简报工具" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DigestCard citationHrefs={citationHrefs} latestDigest={latestDigest} mode={digestMode} referenceItems={referenceItems} />
        <div className="grid content-start gap-3">
          <DigestActionPanel />
          <ModelSettingsForm settings={settings} />
        </div>
      </section>
    </main>
  );
}

function itemsFromStoredReferenceIds(items: Item[], referenceItemIds: string[]): Item[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return referenceItemIds.map((itemId) => itemById.get(itemId)).filter((item): item is Item => Boolean(item));
}

function uniqueItemsById(items: Item[]): Item[] {
  const seen = new Set<string>();
  const result: Item[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}
