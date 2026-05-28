import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import { updateItemStateAction } from "@/app/actions";
import type { Item, Source } from "@/lib/domain";

interface ArticleListProps {
  emptyMessage?: string;
  heading?: string;
  items: Item[];
  sources: Source[];
}

export function ArticleList({
  emptyMessage = "还没有文章。点击获取最新信息会先刷新默认科技源。",
  heading = "最新文章",
  items,
  sources
}: ArticleListProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <section aria-labelledby="article-list-heading" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950" id="article-list-heading">
          {heading}
        </h2>
        <span className="font-mono text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length > 0 ? (
          items.slice(0, 40).map((item) => (
            <article
              className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
              data-testid={articleDomId(item)}
              id={articleDomId(item)}
              key={item.id}
            >
              <a className="flex min-w-0 gap-3 transition hover:bg-slate-50" href={item.url} rel="noreferrer" target="_blank">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-5 text-slate-950">{item.title}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                    <span>{sourceById.get(item.sourceId)?.name ?? item.sourceId}</span>
                    <span> · </span>
                    <span>{formatDate(item.publishedAt)}</span>
                    <span> · </span>
                    <span>{item.summary}</span>
                  </span>
                </span>
                <ArrowSquareOut className="mt-1 shrink-0 text-slate-400" size={15} aria-hidden="true" />
              </a>
              <div className="flex items-center gap-2 sm:justify-end">
                <form action={updateItemStateAction}>
                  <input name="itemId" type="hidden" value={item.id} />
                  <input name="readStatus" type="hidden" value="read" />
                  <button
                    aria-label={`标记 ${item.title} 为已读`}
                    className="min-h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
                    type="submit"
                  >
                    已读
                  </button>
                </form>
                <form action={updateItemStateAction}>
                  <input name="itemId" type="hidden" value={item.id} />
                  <input name="hidden" type="hidden" value="true" />
                  <button
                    aria-label={`隐藏 ${item.title}`}
                    className="min-h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
                    type="submit"
                  >
                    隐藏
                  </button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-600">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

export function articleDomId(item: Pick<Item, "id">) {
  return `article-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
