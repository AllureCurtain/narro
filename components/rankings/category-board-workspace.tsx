import type { AgentTask, Item, RefreshLog, Source } from "@/lib/domain";
import { markVisibleItemsReadAction } from "@/app/actions";
import Link from "next/link";
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
  digestReferenceItems?: Item[];
  items: Item[];
  refreshLogs?: RefreshLog[];
  searchQuery?: string;
  settings: Record<string, string>;
  sources: Source[];
}

export function CategoryBoardWorkspace({
  agentTasks,
  digestReferenceItems = [],
  items,
  refreshLogs,
  searchQuery,
  settings,
  sources
}: CategoryBoardWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const digestMode = latestDigest ? parseDigestTaskMode(latestDigest.input) : undefined;
  const storedReferenceItemIds = latestDigest ? parseDigestTaskReferenceIds(latestDigest.input) : [];
  const storedReferenceItems = itemsFromStoredReferenceIds([...items, ...digestReferenceItems], storedReferenceItemIds);
  const selectedReferenceItems = selectDigestEntries({ items, sources }).map((entry) => entry.item);
  const referenceItems = storedReferenceItemIds.length > 0 ? storedReferenceItems : selectedReferenceItems;
  const board = buildCategoryBoard({ items, sources });
  const renderedItemIds = new Set(board.categories.flatMap((category) => category.items.map((entry) => entry.item.id)));
  const fallbackReferenceItems = referenceItems.filter((item) => !renderedItemIds.has(item.id));
  const renderedItemIdList = [...renderedItemIds];
  const normalizedSearchQuery = searchQuery?.trim();
  const isSearching = Boolean(normalizedSearchQuery);
  const emptyMessage = isSearching
    ? "当前搜索没有匹配文章。请调整关键词或清除搜索。"
    : "暂无内容。点击获取最新信息后，这里会显示该分类的热榜。";
  const citationHrefs = new Map(referenceItems.map((item, index) => [index + 1, `#${categoryArticleDomId(item)}`] as [number, string]));

  return (
    <main aria-label="科技热榜" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <SourceRefreshPanel recentRefreshLogs={refreshLogs ?? []} />

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
            {isSearching ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700">搜索：{normalizedSearchQuery}</span>
                <Link className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50" href="/">
                  清除搜索
                </Link>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.totalItemCount} 条上榜</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{board.updatedSourceCount} 个源已更新</span>
            {renderedItemIdList.length > 0 ? (
              <form action={markVisibleItemsReadAction}>
                <input name="itemIds" type="hidden" value={renderedItemIdList.join(",")} />
                <button
                  className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                  type="submit"
                >
                  标记当前榜单为已读
                </button>
              </form>
            ) : null}
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
            <CategoryRankingCard category={category} emptyMessage={emptyMessage} />
          </div>
        ))}
      </section>

      <section aria-label="简报工具" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          <DigestCard citationHrefs={citationHrefs} latestDigest={latestDigest} mode={digestMode} referenceItems={referenceItems} />
          {fallbackReferenceItems.length > 0 ? (
            <section aria-label="简报来源" className="rounded-md border border-slate-200 bg-white p-4">
              <div className="mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">References</p>
                <h2 className="mt-1 text-base font-semibold tracking-normal text-slate-950">简报来源</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {fallbackReferenceItems.map((item) => {
                  const source = sources.find((candidate) => candidate.id === item.sourceId);
                  if (!source) return null;
                  return (
                    <article className="py-3" data-testid={categoryArticleDomId(item)} id={categoryArticleDomId(item)} key={item.id}>
                      <a
                        className="text-sm font-semibold text-slate-950 underline-offset-2 hover:underline"
                        href={item.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {item.title}
                      </a>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{source.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
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
