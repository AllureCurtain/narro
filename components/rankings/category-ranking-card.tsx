import type { CategoryRanking } from "@/lib/rankings/category-board";
import { CategoryRankingRow } from "./category-ranking-row";

interface CategoryRankingCardProps {
  category: CategoryRanking;
  emptyMessage?: string;
}

export function CategoryRankingCard({
  category,
  emptyMessage = "暂无内容。点击获取最新信息后，这里会显示该分类的热榜。"
}: CategoryRankingCardProps) {
  return (
    <section aria-labelledby={`${category.id}-heading`} className="rounded-md border border-slate-200 bg-white p-4" role="region">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ranking</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-950" id={`${category.id}-heading`}>
            {category.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
          {category.items.length} 条
        </span>
      </div>

      {category.items.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {category.items.map((entry) => (
            <CategoryRankingRow entry={entry} key={entry.item.id} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
