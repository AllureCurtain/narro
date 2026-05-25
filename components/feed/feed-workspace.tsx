import { Clock, Lightning, TrendUp } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { markVisibleItemsReadAction } from "@/app/actions";
import { RefreshControl } from "@/components/app-shell/refresh-control";
import type { EventGroup, Item, Lens, Source, WorkspaceSummary } from "@/lib/domain";
import { FeedCard } from "./feed-card";

interface FeedWorkspaceProps {
  activeLens: Lens;
  activeSourceId?: string;
  activeView?: "all" | "hidden" | "reading" | "saved" | "unread";
  eventGroups: EventGroup[];
  filterValues?: {
    entity?: string;
    minImportance?: number;
    since?: string;
    tag?: string;
  };
  items: Item[];
  searchQuery?: string;
  selectedEventId?: string;
  selectedItemId?: string;
  sources: Source[];
  summary: WorkspaceSummary;
}

const views = [
  ["all", "最新"],
  ["saved", "收藏"],
  ["reading", "待读"],
  ["unread", "未读"],
  ["hidden", "隐藏"]
] as const;

export function FeedWorkspace({
  activeLens,
  activeSourceId,
  activeView = "all",
  eventGroups,
  filterValues,
  items,
  searchQuery,
  selectedEventId,
  selectedItemId,
  sources,
  summary
}: FeedWorkspaceProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const activeSource = activeSourceId ? sourceById.get(activeSourceId) : undefined;
  const updateLabel = latestFetchedAtLabel(items);
  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) : undefined;
  const selectedEventGroup = selectedEventId ? eventGroups.find((eventGroup) => eventGroup.id === selectedEventId) : undefined;
  const selectedEventItems = selectedEventGroup ? items.filter((item) => selectedEventGroup.itemIds.includes(item.id)) : [];

  return (
    <main aria-label="实时信息流" className="min-w-0 bg-[#f8fafc] p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">实时信息流</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-[28px]">
            {activeLens.name}
          </h1>
          <p className="mt-2 max-w-[72ch] text-sm leading-6 text-slate-600">{activeLens.description}</p>
          {activeSource ? (
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
              <span className="font-medium text-teal-700">当前来源</span>
              <span className="truncate">{activeSource.name}</span>
              <span className="font-mono text-teal-700">{items.length}</span>
              <Link className="font-medium text-teal-800 underline-offset-2 hover:underline" href={`/?lens=${activeLens.id}`}>
                清除
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-md border border-slate-200 bg-white p-2 text-center shadow-[0_18px_35px_-32px_rgba(15,23,42,0.45)]">
          <Metric label="未读" value={summary.totalUnreadCount.toString()} />
          <Metric label="事件" value={eventGroups.length.toString()} />
          <Metric label="源" value={summary.updatedSourceCount.toString()} />
        </div>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {views.map(([view, label]) => (
          <Link
            className={[
              "inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-sm transition active:translate-y-px",
              activeView === view ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
            ].join(" ")}
            href={viewHref(activeLens.id, view, activeSourceId)}
            key={view}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="mb-3 rounded-md border border-slate-200 bg-white p-3" aria-labelledby="advanced-filter-heading">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="advanced-filter-heading">
            高级筛选
          </h2>
          <form action={markVisibleItemsReadAction}>
            <input name="itemIds" type="hidden" value={items.filter((item) => item.readStatus !== "read").map((item) => item.id).join(",")} />
            <button
              className="min-h-8 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition active:translate-y-px"
              type="submit"
            >
              全部标为已读
            </button>
          </form>
        </div>
        <form action="/" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input name="lens" type="hidden" value={activeLens.id} />
          {activeSourceId ? <input name="source" type="hidden" value={activeSourceId} /> : null}
          {activeView !== "all" ? <input name="view" type="hidden" value={activeView} /> : null}
          <FilterInput label="搜索" name="q" placeholder="标题、摘要、实体" value={searchQuery} />
          <FilterInput label="实体" name="entity" placeholder="OpenAI" value={filterValues?.entity} />
          <FilterInput label="标签" name="tag" placeholder="community" value={filterValues?.tag} />
          <FilterInput label="最低重要性" name="min" placeholder="80" type="number" value={filterValues?.minImportance?.toString()} />
          <FilterInput label="起始日期" name="since" placeholder="2026-05-21" type="date" value={dateInputValue(filterValues?.since)} />
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-3">
            <button className="min-h-9 rounded-md bg-slate-950 px-3 text-xs font-medium text-white transition active:translate-y-px" type="submit">
              应用筛选
            </button>
            <Link className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700" href={`/?lens=${activeLens.id}`}>
              清除筛选
            </Link>
          </div>
        </form>
      </section>

      <section className="mb-3 rounded-md bg-[#132136] p-4 text-white shadow-[0_20px_45px_-40px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs text-teal-100">
              <Lightning size={14} weight="fill" aria-hidden="true" />
              当前 Lens 摘要
            </div>
            <h2 className="text-base font-semibold tracking-normal">{summary.digestTitle}</h2>
            <p className="mt-2 max-w-[82ch] text-sm leading-6 text-slate-300">{summary.digestBody}</p>
          </div>
          <span className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md bg-white/10 px-3 text-xs text-slate-200">
            <Clock size={14} aria-hidden="true" />
            {updateLabel}
          </span>
        </div>
      </section>

      {selectedItem ? (
        <section className="mb-3 rounded-md border border-teal-200 bg-white p-4" aria-labelledby="item-detail-heading">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">详情</span>
            <span>{sourceById.get(selectedItem.sourceId)?.name ?? "未知来源"}</span>
            <span className="font-mono text-teal-700">{selectedItem.importanceScore}</span>
          </div>
          <h2 className="text-lg font-semibold leading-6 text-slate-950" id="item-detail-heading">
            {selectedItem.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedItem.summary}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            <span className="font-medium text-slate-700">判断原因：</span>
            {selectedItem.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700" href={selectedItem.url} target="_blank">
              打开原文
            </Link>
            <Link className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700" href={viewHref(activeLens.id, activeView, activeSourceId)}>
              关闭详情
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="event-group-heading" className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="event-group-heading">
            事件组与趋势
          </h2>
          <TrendUp size={16} className="text-slate-400" aria-hidden="true" />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {eventGroups.map((eventGroup) => (
            <div className="rounded-md border border-slate-200 bg-white p-3" key={eventGroup.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-5 text-slate-900">{eventGroup.title}</h3>
                <span className="rounded-full bg-amber-50 px-2 py-1 font-mono text-[11px] text-amber-700">
                  {eventGroup.importanceScore}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{eventGroup.summary}</p>
              <Link
                className="mt-3 inline-flex min-h-7 items-center rounded-md border border-slate-200 px-2 text-[11px] font-medium text-slate-700"
                href={eventHref(activeLens.id, eventGroup.id, activeSourceId)}
              >
                查看事件详情
              </Link>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {eventGroup.mainEntities.map((entity) => (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600" key={entity}>
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedEventGroup ? (
        <section className="mb-3 rounded-md border border-amber-200 bg-white p-4" aria-labelledby="event-detail-heading">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">事件详情</span>
            <span>{`涉及 ${selectedEventGroup.itemIds.length} 条信息`}</span>
            <span>{`${selectedEventGroup.sourceCount} 个来源`}</span>
          </div>
          <h2 className="text-lg font-semibold leading-6 text-slate-950" id="event-detail-heading">
            {selectedEventGroup.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedEventGroup.summary}</p>
          <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {selectedEventItems.map((item) => (
              <Link className="block px-3 py-2 text-xs text-slate-700 hover:bg-slate-50" href={detailHref(item, activeLens.id, activeView)} key={item.id}>
                {sourceById.get(item.sourceId)?.name ?? "未知来源"} · {item.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="feed-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="feed-heading">
            信息流
          </h2>
          <span className="font-mono text-xs text-slate-500">{items.length} items</span>
        </div>

        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item) => (
              <FeedCard
                item={item}
                key={item.id}
                lensId={activeLens.id}
                source={sourceById.get(item.sourceId)}
                view={activeView}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-900">还没有真实入库信息。</p>
              <p className="mt-1">点击刷新后，Narro 会从已验证免费源读取 RSS/Atom，标准化并写入本地数据库。</p>
              <div className="mt-4 rounded-md bg-slate-950 p-2 text-white">
                <RefreshControl />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function viewHref(lensId: string, view: string, sourceId?: string) {
  const params = new URLSearchParams({ lens: lensId });
  if (sourceId) params.set("source", sourceId);
  if (view !== "all") params.set("view", view);
  return `/?${params.toString()}`;
}

function eventHref(lensId: string, eventId: string, sourceId?: string) {
  const params = new URLSearchParams({ event: eventId, lens: lensId });
  if (sourceId) params.set("source", sourceId);
  return `/?${params.toString()}`;
}

function detailHref(item: Item, lensId: string, view: string) {
  const params = new URLSearchParams({ item: item.id, lens: lensId, source: item.sourceId });
  if (view !== "all") params.set("view", view);
  return `/?${params.toString()}`;
}

interface FilterInputProps {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  value?: string;
}

function FilterInput({ label, name, placeholder, type = "text", value }: FilterInputProps) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function dateInputValue(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toISOString().slice(0, 10);
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-16 px-2 py-1">
      <p className="font-mono text-lg font-semibold leading-none text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function latestFetchedAtLabel(items: Item[]) {
  const latest = items
    .map((item) => new Date(item.fetchedAt))
    .filter((date) => !Number.isNaN(date.valueOf()))
    .sort((left, right) => right.valueOf() - left.valueOf())[0];

  if (!latest) return "等待刷新";

  return `${new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(latest)} 更新`;
}
