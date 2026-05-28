import type { AgentTask, Item, Source } from "@/lib/domain";
import { selectDigestEntries } from "@/lib/digest/source-pack";
import { parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import { ArticleList } from "./article-list";
import { DigestActionPanel } from "./digest-action-panel";
import { DigestCard } from "./digest-card";
import { ModelSettingsForm } from "./model-settings-form";

interface DigestWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function DigestWorkspace({ agentTasks, items, settings, sources }: DigestWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const storedReferenceItemIds = latestDigest ? parseDigestTaskReferenceIds(latestDigest.input) : [];
  const storedReferenceItems = itemsFromStoredReferenceIds(items, storedReferenceItemIds);
  const selectedReferenceItems = selectDigestEntries({ items, sources }).map((entry) => entry.item);
  const referenceItems = storedReferenceItemIds.length > 0 ? storedReferenceItems : selectedReferenceItems;
  const displayedItems = referenceItems.length > 0 ? referenceItems : items.slice(0, 24);

  return (
    <main aria-label="今日科技简报" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <DigestActionPanel />
      <ModelSettingsForm settings={settings} />
      <DigestCard latestDigest={latestDigest} referenceItems={displayedItems} />
      <ArticleList items={displayedItems} sources={sources} />
    </main>
  );
}

function itemsFromStoredReferenceIds(items: Item[], referenceItemIds: string[]): Item[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return referenceItemIds.map((itemId) => itemById.get(itemId)).filter((item): item is Item => Boolean(item));
}
