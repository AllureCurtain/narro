import { ArrowSquareOut, EyeSlash } from "@phosphor-icons/react/ssr";
import { updateItemStateAction } from "@/app/actions";
import type { RankedCategoryItem } from "@/lib/rankings/category-board";

interface CategoryRankingRowProps {
  entry: RankedCategoryItem;
}

export function CategoryRankingRow({ entry }: CategoryRankingRowProps) {
  const { item, rank, source } = entry;

  return (
    <article className="grid gap-2 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]" data-testid={categoryArticleDomId(item)} id={categoryArticleDomId(item)}>
      <span
        className={[
          "flex size-8 items-center justify-center rounded-md font-mono text-xs font-semibold",
          rank <= 3 ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"
        ].join(" ")}
      >
        {rank.toString().padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <a className="block underline-offset-2 hover:underline" href={item.url} rel="noreferrer" target="_blank">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.title}</h3>
        </a>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] leading-5 text-slate-500">
          <span>{source.name}</span>
          <span>{formatDate(item.publishedAt)}</span>
          <span className="font-mono text-teal-700">{item.importanceScore}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
      </div>

      <div className="flex items-start gap-1 sm:justify-end">
        <a
          aria-label="打开原文"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
          href={item.url}
          rel="noreferrer"
          target="_blank"
        >
          <ArrowSquareOut size={14} aria-hidden="true" />
          打开原文
        </a>
        <form action={updateItemStateAction}>
          <input name="itemId" type="hidden" value={item.id} />
          <input name="readStatus" type="hidden" value="read" />
          <button
            aria-label={`标记 ${item.title} 为已读`}
            className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
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
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
            type="submit"
          >
            <EyeSlash size={14} aria-hidden="true" />
            隐藏
          </button>
        </form>
      </div>
    </article>
  );
}

export function categoryArticleDomId(item: { id: string }) {
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
