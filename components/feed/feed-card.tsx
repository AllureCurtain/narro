import { ArrowSquareOut, BookmarkSimple, EyeSlash, Target } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { updateItemStateAction } from "@/app/actions";
import type { Item, Source } from "@/lib/domain";

interface FeedCardProps {
  lensId: string;
  item: Item;
  source?: Source;
  view?: string;
}

const actionIcons = {
  保存: BookmarkSimple,
  取消保存: BookmarkSimple,
  隐藏: EyeSlash,
  追踪: Target,
  打开原文: ArrowSquareOut,
  对比: Target,
  总结: BookmarkSimple,
  解释: Target
};

export function FeedCard({ lensId, item, source, view = "all" }: FeedCardProps) {
  return (
    <article className="grid min-h-[180px] gap-3 rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50/40 sm:p-4">
      <div className="min-w-0">
        <div className="mb-2 flex min-h-6 flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="max-w-[180px] truncate rounded-full bg-slate-100 px-2 py-1">{source?.name ?? "未知来源"}</span>
          <span>{formatTime(item.publishedAt)}</span>
          <span className="rounded-full bg-teal-50 px-2 py-1 font-mono text-teal-700">{item.importanceScore}</span>
          {item.eventGroupId ? (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">事件组</span>
          ) : null}
        </div>

        <Link className="block underline-offset-2 hover:underline" href={detailHref(item, lensId, view)}>
          <h3 className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-5 tracking-normal text-slate-950">
            {item.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-600">{item.summary}</p>
        {item.aiSummary ? (
          <p className="mt-2 line-clamp-2 rounded-md border border-teal-100 bg-teal-50/70 p-2 text-xs leading-5 text-slate-700">
            {item.aiSummary}
          </p>
        ) : null}

        <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
          {item.entities.slice(0, 4).map((entity) => (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600" key={entity}>
              {entity}
            </span>
          ))}
          {item.entities.length > 4 ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
              +{item.entities.length - 4}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-9 flex-col gap-2 border-t border-slate-100 pt-2 md:flex-row md:items-center md:justify-between">
        <p className="line-clamp-1 min-w-0 text-xs leading-5 text-slate-500">
          <span className="font-medium text-slate-700">重要性原因：</span>
          {item.reason}
        </p>
        <div className="flex shrink-0 flex-wrap gap-1">
          {item.actionLabels.map((label) => {
            const Icon = actionIcons[label as keyof typeof actionIcons] ?? BookmarkSimple;

            return (
              label === "打开原文" ? (
                <a
                  className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                  href={item.url}
                  key={label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </a>
              ) : (
                <form action={updateItemStateAction} key={label}>
                  <input name="itemId" type="hidden" value={item.id} />
                  {stateInputs(label, item)}
                  <button
                    className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                    type="submit"
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                </form>
              )
            );
          })}
        </div>
      </div>
    </article>
  );
}

function detailHref(item: Item, lensId: string, view: string) {
  const params = new URLSearchParams({ item: item.id, lens: lensId, source: item.sourceId });
  if (view !== "all") params.set("view", view);
  return `/?${params.toString()}`;
}

function stateInputs(label: string, item: Item) {
  if (label === "保存") return <input name="saved" type="hidden" value="true" />;
  if (label === "取消保存") return <input name="saved" type="hidden" value="false" />;
  if (label === "已读") return <input name="readStatus" type="hidden" value="read" />;
  if (label === "标为未读") return <input name="readStatus" type="hidden" value="unread" />;
  if (label === "隐藏") return <input name="hidden" type="hidden" value="true" />;
  if (label === "恢复") return <input name="hidden" type="hidden" value="false" />;
  if (label === "待读") return <input name="readStatus" type="hidden" value={item.readStatus === "reading" ? "unread" : "reading"} />;
  if (label === "取消待读") return <input name="readStatus" type="hidden" value="unread" />;
  return null;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
}
