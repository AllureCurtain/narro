import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import type { Item, Source } from "@/lib/domain";

interface ArticleListProps {
  items: Item[];
  sources: Source[];
}

export function ArticleList({ items, sources }: ArticleListProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <section aria-labelledby="article-list-heading" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950" id="article-list-heading">
          引用文章
        </h2>
        <span className="font-mono text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length > 0 ? (
          items.slice(0, 24).map((item, index) => (
            <a
              className="flex gap-3 py-3 text-sm transition hover:bg-slate-50"
              data-testid={`article-ref-${index + 1}`}
              href={item.url}
              id={`article-ref-${index + 1}`}
              key={item.id}
              rel="noreferrer"
              target="_blank"
            >
              <span className="mt-0.5 font-mono text-xs text-slate-400">[{index + 1}]</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-5 text-slate-950">{item.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                  {sourceById.get(item.sourceId)?.name ?? item.sourceId} · {item.summary}
                </span>
              </span>
              <ArrowSquareOut className="mt-1 shrink-0 text-slate-400" size={15} aria-hidden="true" />
            </a>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-600">还没有可引用文章。点击生成简报会先刷新默认科技源。</p>
        )}
      </div>
    </section>
  );
}
