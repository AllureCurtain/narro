import type { AgentTask, Item, Source } from "@/lib/domain";
import { selectDigestEntries } from "@/lib/digest/source-pack";
import { parseDigestTaskMode, parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import { DigestActionPanel } from "@/components/digest/digest-action-panel";
import { DigestCard } from "@/components/digest/digest-card";
import { ModelSettingsForm } from "@/components/digest/model-settings-form";
import { SourceRefreshPanel } from "@/components/digest/source-refresh-panel";
import { buildCategoryBoard } from "@/lib/rankings/category-board";
import { CategoryRankingCard } from "./category-ranking-card";
import { categoryArticleDomId } from "./category-ranking-row";

interface CategoryBoardWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function CategoryBoardWorkspace({ agentTasks, items, settings, sources }: CategoryBoardWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const digestMode = latestDigest ? parseDigestTaskMode(latestDigest.input) : undefined;
  const storedReferenceItemIds = latestDigest ? parseDigestTaskReferenceIds(latestDigest.input) : [];
  const storedReferenceItems = itemsFromStoredReferenceIds(items, storedReferenceItemIds);
  const selectedReferenceItems = selectDigestEntries({ items, sources }).map((entry) => entry.item);
  const referenceItems = storedReferenceItemIds.length > 0 ? storedReferenceItems : selectedReferenceItems;
  const boardItems = uniqueItemsById([...items, ...referenceItems]);
  const board = buildCategoryBoard({ items: boardItems, sources });
  const renderedItemIds = new Set(board.categories.flatMap((category) => category.items.map((entry) => entry.item.id)));
  const citationHrefs = new Map(
    referenceItems.flatMap((item, index) =>
      renderedItemIds.has(item.id) ? ([[index + 1, `#${categoryArticleDomId(item)}`]] as Array<[number, string]>) : []
    )
  );

  return (
    <main aria-label="科技热榜" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <SourceRefreshPanel />

      <section className="rounded-md border border-slate-200 bg-white p-4" aria-labelledby="ranking-board-heading">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">TopHub-style board</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950" id="ranking-board-heading">
              科技热榜
            </h1>
            <p className="mt-2 max-w-[72ch] text-sm leading-6 text-slate-600">
              按 AI、社区、工程、平台和中文技术聚合已抓取文章，先扫榜单，再打开原文。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.totalItemCount} 条上榜</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.updatedSourceCount} 个源已更新</span>
          </div>
        </div>

        <nav aria-label="热榜分类" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {board.categories.map((category) => (
            <a
              className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:bg-white active:translate-y-px"
              href={`#${category.id}`}
              key={category.id}
            >
              {category.title}
            </a>
          ))}
        </nav>
      </section>

      <section aria-label="分类榜单" className="grid gap-3 lg:grid-cols-2">
        {board.categories.map((category) => (
          <div id={category.id} key={category.id}>
            <CategoryRankingCard category={category} />
          </div>
        ))}
      </section>

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
